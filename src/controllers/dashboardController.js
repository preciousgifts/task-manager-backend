import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { BRAG_STATUS, ROLES } from '../utils/constants.js';
import { syncBragStatuses } from '../utils/statusSync.js';

const countByStatus = async (model, where = {}) => {
  const rows = await prisma[model].groupBy({ by: ['bragStatus'], where, _count: { bragStatus: true } });
  return Object.values(BRAG_STATUS).reduce((acc, status) => {
    acc[status] = rows.find((row) => row.bragStatus === status)?._count.bragStatus || 0;
    return acc;
  }, {});
};

const mergeStatusCounts = (first, second) =>
  Object.values(BRAG_STATUS).reduce((acc, status) => {
    acc[status] = (first[status] || 0) + (second[status] || 0);
    return acc;
  }, {});

export const getSummary = asyncHandler(async (req, res) => {
  const projectWhere = {};
  let taskWhere = {};
  let planWhere = {};

  if (req.user.role === ROLES.PM) {
    const ownedProjects = await prisma.project.findMany({
      where: { ownerId: req.user.id },
      select: { id: true }
    });
    const ids = ownedProjects.map((p) => p.id);
    projectWhere.id = { in: ids };
    taskWhere.projectId = { in: ids };
    planWhere.projectId = { in: ids };
  }

  if (req.user.role === ROLES.TEAM_MEMBER) {
    const userId = req.user.id;
    taskWhere.assignedToId = userId;
    planWhere.assignedToId = userId;
    const [assignedTasks, assignedPlans] = await Promise.all([
      prisma.task.findMany({ where: { assignedToId: userId }, select: { projectId: true } }),
      prisma.planItem.findMany({ where: { assignedToId: userId }, select: { projectId: true } })
    ]);
    const ids = [...new Set([...assignedTasks, ...assignedPlans].map((i) => i.projectId))];
    projectWhere.id = { in: ids };
  }

  // Bulk status refresh — 4 updateMany each, run in parallel (replaces N individual UPDATEs)
  await Promise.all([
    syncBragStatuses('task', taskWhere),
    syncBragStatuses('planItem', planWhere)
  ]);

  const today = new Date();

  const [
    totalProjects,
    regularTasks,
    projectTasks,
    projectStatus,
    regularTaskStatus,
    planTaskStatus,
    overdueTasks,
    overduePlanItems
  ] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.task.count({ where: taskWhere }),
    prisma.planItem.count({ where: planWhere }),
    countByStatus('project', projectWhere),
    countByStatus('task', taskWhere),
    countByStatus('planItem', planWhere),
    prisma.task.count({
      where: {
        ...taskWhere,
        bragStatus: { not: BRAG_STATUS.BLUE },
        OR: [
          { revisedDate: null, dueDate: { lt: today } },
          { revisedDate: { not: null, lt: today } }
        ]
      }
    }),
    prisma.planItem.count({
      where: {
        ...planWhere,
        bragStatus: { not: BRAG_STATUS.BLUE },
        OR: [
          { revisedDate: null, dueDate: { lt: today } },
          { revisedDate: { not: null, lt: today } }
        ]
      }
    })
  ]);

  const taskStatus = mergeStatusCounts(regularTaskStatus, planTaskStatus);

  ok(res, {
    summary: {
      totalProjects,
      totalTasks: regularTasks + projectTasks,
      completedTasks: taskStatus.Blue,
      delayedTasks: taskStatus.Red,
      threatenedTasks: taskStatus.Amber,
      onTrackTasks: taskStatus.Green,
      overdueTasks: overdueTasks + overduePlanItems,
      projectStatus,
      taskStatus
    }
  });
});
