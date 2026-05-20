import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { BRAG_STATUS, ROLES } from '../utils/constants.js';
import { toApi } from '../utils/serialize.js';
import { ensureProjectManagerAccess } from '../utils/access.js';

const taskInclude = {
  project: { select: { id: true, name: true, bragStatus: true } },
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
  comments: { include: { author: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: 'asc' } }
};

const buildTaskWhere = async (user, { project, status, search }) => {
  const where = {};
  if (project) where.projectId = project;
  if (status) where.bragStatus = status;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  if (user.role === ROLES.TEAM_MEMBER) where.assignedToId = user.id || user._id;
  if (user.role === ROLES.PM) {
    const projects = await prisma.project.findMany({ where: { ownerId: user.id || user._id }, select: { id: true } });
    const ids = projects.map((item) => item.id);
    where.projectId = project && ids.includes(project) ? project : { in: ids };
  }
  return where;
};

const markOverdueTasks = (where) =>
  prisma.task.updateMany({
    where: { ...where, dueDate: { lt: new Date() }, bragStatus: { not: BRAG_STATUS.BLUE } },
    data: { bragStatus: BRAG_STATUS.RED }
  });

const taskData = (payload) => ({
  projectId: payload.project || payload.projectId,
  title: payload.title,
  description: payload.description ?? '',
  assignedToId: payload.assignedTo !== undefined ? payload.assignedTo : payload.assignedToId || null,
  startDate: new Date(payload.startDate),
  dueDate: new Date(payload.dueDate),
  bragStatus: payload.bragStatus ?? 'Green',
  priority: payload.priority ?? 'Medium'
});

export const getTasks = asyncHandler(async (req, res) => {
  const where = await buildTaskWhere(req.user, req.query);
  await markOverdueTasks(where);
  const tasks = await prisma.task.findMany({ where, include: taskInclude, orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }] });
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
  if (data.dueDate < new Date() && data.bragStatus !== BRAG_STATUS.BLUE) data.bragStatus = BRAG_STATUS.RED;
  const task = await prisma.task.create({ data, include: taskInclude });
  created(res, { task: toApi(task) }, 'Task created');
});

export const updateTask = asyncHandler(async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Task not found', 404);
  await ensureProjectManagerAccess(req.user, existing.projectId);

  const data = taskData({ ...existing, ...req.body, project: existing.projectId });
  if (data.dueDate < new Date() && data.bragStatus !== BRAG_STATUS.BLUE) data.bragStatus = BRAG_STATUS.RED;
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
  if (req.user.role === ROLES.TEAM_MEMBER && task.assignedToId !== (req.user.id || req.user._id)) {
    throw new AppError('You can only comment on tasks assigned to you', 403);
  }

  await prisma.taskComment.create({ data: { taskId: task.id, text: req.body.text, authorId: req.user.id || req.user._id } });
  const populatedTask = await prisma.task.findUnique({ where: { id: task.id }, include: taskInclude });
  created(res, { task: toApi(populatedTask) }, 'Comment added');
});
