import Project from '../models/Project.js';
import Task from '../models/Task.js';
import PlanItem from '../models/PlanItem.js';
import RaidItem from '../models/RaidItem.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { ROLES } from '../utils/constants.js';

const projectAccessQuery = (user) => {
  if (user.role === ROLES.ADMIN) return {};
  if (user.role === ROLES.PM) return { owner: user._id };
  return {};
};

export const getProjects = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const query = projectAccessQuery(req.user);
  if (status) query.bragStatus = status;
  if (search) query.name = { $regex: search, $options: 'i' };

  let projects = await Project.find(query).populate('owner', 'name email role').sort({ updatedAt: -1 });

  if (req.user.role === ROLES.TEAM_MEMBER) {
    const [taskProjectIds, planProjectIds] = await Promise.all([
      Task.distinct('project', { assignedTo: req.user._id }),
      PlanItem.distinct('project', { assignedTo: req.user._id })
    ]);
    const assignedProjectIds = [...new Set([...taskProjectIds, ...planProjectIds].map((id) => id.toString()))];
    projects = await Project.find({ _id: { $in: assignedProjectIds }, ...(status ? { bragStatus: status } : {}) })
      .populate('owner', 'name email role')
      .sort({ updatedAt: -1 });
  }

  ok(res, { projects });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('owner', 'name email role');
  if (!project) throw new AppError('Project not found', 404);
  if (req.user.role === ROLES.PM && project.owner._id.toString() !== req.user._id.toString()) {
    throw new AppError('Project managers can only view their own projects', 403);
  }
  if (req.user.role === ROLES.TEAM_MEMBER) {
    const [assignedTask, assignedPlanItem] = await Promise.all([
      Task.exists({ project: project._id, assignedTo: req.user._id }),
      PlanItem.exists({ project: project._id, assignedTo: req.user._id })
    ]);
    if (!assignedTask && !assignedPlanItem) throw new AppError('You can only view projects with work assigned to you', 403);
  }
  ok(res, { project });
});

export const createProject = asyncHandler(async (req, res) => {
  const owner = req.user.role === ROLES.ADMIN ? req.body.owner || req.user._id : req.user._id;
  const project = await Project.create({ ...req.body, owner });
  await project.populate('owner', 'name email role');
  created(res, { project }, 'Project created');
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  if (req.user.role === ROLES.PM && project.owner.toString() !== req.user._id.toString()) {
    throw new AppError('Project managers can only edit their own projects', 403);
  }

  Object.assign(project, req.body);
  await project.save();
  await project.populate('owner', 'name email role');
  ok(res, { project }, 'Project updated');
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  if (req.user.role === ROLES.PM && project.owner.toString() !== req.user._id.toString()) {
    throw new AppError('Project managers can only delete their own projects', 403);
  }

  await Task.deleteMany({ project: project._id });
  await PlanItem.deleteMany({ project: project._id });
  await RaidItem.deleteMany({ project: project._id });
  await project.deleteOne();
  ok(res, null, 'Project and related tasks deleted');
});
