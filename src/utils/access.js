import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { ROLES } from './constants.js';

export const getAccessibleProjectIds = async (user) => {
  if (user.role === ROLES.ADMIN) return null;
  if (user.role === ROLES.PM) {
    const projects = await prisma.project.findMany({ where: { ownerId: user.id || user._id }, select: { id: true } });
    return projects.map((project) => project.id);
  }

  const [tasks, planItems] = await Promise.all([
    prisma.task.findMany({ where: { assignedToId: user.id || user._id }, select: { projectId: true } }),
    prisma.planItem.findMany({ where: { assignedToId: user.id || user._id }, select: { projectId: true } })
  ]);
  return [...new Set([...tasks, ...planItems].map((item) => item.projectId))];
};

export const ensureProjectAccess = async (user, projectId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('Project not found', 404);

  const userId = user.id || user._id;
  if (user.role === ROLES.PM && project.ownerId !== userId) {
    throw new AppError('Project managers can only access their own projects', 403);
  }

  if (user.role === ROLES.TEAM_MEMBER) {
    const [task, planItem] = await Promise.all([
      prisma.task.findFirst({ where: { projectId: project.id, assignedToId: userId }, select: { id: true } }),
      prisma.planItem.findFirst({ where: { projectId: project.id, assignedToId: userId }, select: { id: true } })
    ]);
    if (!task && !planItem) throw new AppError('You can only access assigned project work', 403);
  }

  return project;
};

export const ensureProjectManagerAccess = async (user, projectId) => {
  const project = await ensureProjectAccess(user, projectId);
  if (user.role === ROLES.TEAM_MEMBER) {
    throw new AppError('Team members cannot manage this project area', 403);
  }
  return project;
};
