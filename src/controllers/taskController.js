import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { BRAG_STATUS, ROLES } from '../utils/constants.js';
import { toApi } from '../utils/serialize.js';
import { ensureProjectManagerAccess } from '../utils/access.js';
import { syncBragStatuses } from '../utils/statusSync.js';

const taskInclude = {
  project: { select: { id: true, name: true, bragStatus: true } },
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
  comments: {
    include: { author: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'asc' }
  }
};

const dateOnly = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const deriveStatus = ({ dueDate, revisedDate, bragStatus, progress }) => {
  if (bragStatus === BRAG_STATUS.BLUE || Number(progress) >= 100) return BRAG_STATUS.BLUE;
  const today = dateOnly(new Date());
  const effectiveDue = dateOnly(revisedDate || dueDate);
  if (effectiveDue < today) return BRAG_STATUS.RED;
  const daysRemaining = Math.ceil((effectiveDue - today) / 86400000);
  return daysRemaining <= 7 ? BRAG_STATUS.AMBER : BRAG_STATUS.GREEN;
};

const buildTaskWhere = async (user, { project, status, search }) => {
  const where = {};
  if (project) where.projectId = project;
  if (status) where.bragStatus = status;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  if (user.role === ROLES.TEAM_MEMBER) {
    where.assignedToId = user.id;
  } else if (user.role === ROLES.PM) {
    const projects = await prisma.project.findMany({
      where: { ownerId: user.id },
      select: { id: true }
    });
    const ids = projects.map((p) => p.id);
    where.projectId = project && ids.includes(project) ? project : { in: ids };
  }
  return where;
};

const taskData = (payload) => ({
  projectId: payload.project || payload.projectId,
  title: payload.title,
  description: payload.description ?? '',
  assignedToId: payload.assignedTo !== undefined ? payload.assignedTo : payload.assignedToId || null,
  startDate: new Date(payload.startDate),
  dueDate: new Date(payload.dueDate),
  revisedDate: payload.revisedDate ? new Date(payload.revisedDate) : null,
  bragStatus: payload.bragStatus ?? 'Green',
  priority: payload.priority ?? 'Medium',
  progress: Number(payload.progress ?? 0)
});

export const getTasks = asyncHandler(async (req, res) => {
  const where = await buildTaskWhere(req.user, req.query);
  // Bulk status refresh — 4 updateMany instead of N individual UPDATEs
  await syncBragStatuses('task', where);
  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }]
  });
  ok(res, { tasks: toApi(tasks) });
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: taskInclude });
  if (!task) throw new AppError('Task not found', 404);
  ok(res, { task: toApi(task) });
});

export const createTask = asyncHandler(async (req, res) => {
  await ensureProjectManagerAccess(req.user, req.body.project);
  const data = taskData(req.body);
  data.bragStatus = deriveStatus(data);
  const task = await prisma.task.create({ data, include: taskInclude });
  created(res, { task: toApi(task) }, 'Task created');
});

export const updateTask = asyncHandler(async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Task not found', 404);
  const userId = req.user.id;
  const isOwner = existing.assignedToId === userId;
  const isManager = req.user.role !== ROLES.TEAM_MEMBER;
  if (!isManager && !isOwner) throw new AppError('You can only update tasks assigned to you', 403);
  if (isManager) await ensureProjectManagerAccess(req.user, existing.projectId);

  const data = isManager
    ? taskData({ ...existing, ...req.body, project: existing.projectId })
    : {
        bragStatus: req.body.bragStatus ?? existing.bragStatus,
        progress: Number(req.body.progress ?? existing.progress),
        revisedDate: req.body.revisedDate ? new Date(req.body.revisedDate) : existing.revisedDate
      };
  data.bragStatus = deriveStatus({ ...existing, ...data });
  const task = await prisma.task.update({ where: { id: req.params.id }, data, include: taskInclude });
  ok(res, { task: toApi(task) }, 'Task updated');
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) throw new AppError('Task not found', 404);
  await ensureProjectManagerAccess(req.user, task.projectId);
  await prisma.task.delete({ where: { id: req.params.id } });
  ok(res, null, 'Task deleted');
});

export const addComment = asyncHandler(async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) throw new AppError('Task not found', 404);
  if (req.user.role === ROLES.TEAM_MEMBER && task.assignedToId !== req.user.id) {
    throw new AppError('You can only comment on tasks assigned to you', 403);
  }
  await prisma.taskComment.create({
    data: { taskId: task.id, text: req.body.text, authorId: req.user.id }
  });
  const populatedTask = await prisma.task.findUnique({ where: { id: task.id }, include: taskInclude });
  created(res, { task: toApi(populatedTask) }, 'Comment added');
});
