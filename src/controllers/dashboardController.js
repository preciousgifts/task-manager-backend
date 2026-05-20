import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { BRAG_STATUS, ROLES } from '../utils/constants.js';

const countByStatus = async (model, where = {}) => {
  const rows = await prisma[model].groupBy({ by: ['bragStatus'], where, _count: { bragStatus: true } });
  return Object.values(BRAG_STATUS).reduce((acc, status) => {
    acc[status] = rows.find((row) => row.bragStatus === status)?._count.bragStatus || 0;
    return acc;
  }, {});
};

export const getSummary = asyncHandler(async (req, res) => {
  const projectWhere = {};
  const taskWhere = {};

  if (req.user.role === ROLES.PM) {
    const ownedProjects = await prisma.project.findMany({ where: { ownerId: req.user.id || req.user._id }, select: { id: true } });
    const ids = ownedProjects.map((project) => project.id);
    projectWhere.id = { in: ids };
    taskWhere.projectId = { in: ids };
  }

  if (req.user.role === ROLES.TEAM_MEMBER) {
    taskWhere.assignedToId = req.user.id || req.user._id;
    const assignedTasks = await prisma.task.findMany({ where: taskWhere, select: { projectId: true } });
    const assignedPlans = await prisma.planItem.findMany({ where: { assignedToId: req.user.id || req.user._id }, select: { projectId: true } });
    projectWhere.id = { in: [...new Set([...assignedTasks, ...assignedPlans].map((item) => item.projectId))] };
  }

  const [totalProjects, totalTasks, projectStatus, taskStatus, overdueTasks] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.task.count({ where: taskWhere }),
    countByStatus('project', projectWhere),
    countByStatus('task', taskWhere),
    prisma.task.count({
      where: {
        ...taskWhere,
        dueDate: { lt: new Date() },
        bragStatus: { not: BRAG_STATUS.BLUE }
      }
    })
  ]);

  ok(res, {
    summary: {
      totalProjects,
      totalTasks,
      completedTasks: taskStatus.Blue,
      delayedTasks: taskStatus.Red,
      threatenedTasks: taskStatus.Amber,
      onTrackTasks: taskStatus.Green,
      overdueTasks,
      projectStatus,
      taskStatus
    }
  });
});
