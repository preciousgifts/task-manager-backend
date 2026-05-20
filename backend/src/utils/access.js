import Project from '../models/Project.js';
import Task from '../models/Task.js';
import PlanItem from '../models/PlanItem.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { ROLES } from './constants.js';

export const getAccessibleProjectIds = async (user) => {
  if (user.role === ROLES.ADMIN) return null;
  if (user.role === ROLES.PM) {
    const projects = await Project.find({ owner: user._id }).select('_id');
    return projects.map((project) => project._id);
  }

  const [taskProjectIds, planProjectIds] = await Promise.all([
    Task.distinct('project', { assignedTo: user._id }),
    PlanItem.distinct('project', { assignedTo: user._id })
  ]);
  return [...new Set([...taskProjectIds, ...planProjectIds].map((id) => id.toString()))];
};

export const ensureProjectAccess = async (user, projectId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  if (user.role === ROLES.PM && project.owner.toString() !== user._id.toString()) {
    throw new AppError('Project managers can only access their own projects', 403);
  }

  if (user.role === ROLES.TEAM_MEMBER) {
    const [task, planItem] = await Promise.all([
      Task.exists({ project: project._id, assignedTo: user._id }),
      PlanItem.exists({ project: project._id, assignedTo: user._id })
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
