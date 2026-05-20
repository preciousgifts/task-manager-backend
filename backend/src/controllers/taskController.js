import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { ROLES } from '../utils/constants.js';

const populateTask = (query) =>
  query
    .populate('project', 'name bragStatus')
    .populate('assignedTo', 'name email role')
    .populate('comments.author', 'name email role');

const ensureCanManageTask = async (user, projectId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);
  if (user.role === ROLES.PM && project.owner.toString() !== user._id.toString()) {
    throw new AppError('Project managers can only manage tasks for their own projects', 403);
  }
  if (user.role === ROLES.TEAM_MEMBER) {
    throw new AppError('Team members cannot manage tasks', 403);
  }
  return project;
};

export const getTasks = asyncHandler(async (req, res) => {
  const { project, status, search } = req.query;
  const query = {};
  if (project) query.project = project;
  if (status) query.bragStatus = status;
  if (search) query.title = { $regex: search, $options: 'i' };

  if (req.user.role === ROLES.TEAM_MEMBER) {
    query.assignedTo = req.user._id;
  } else if (req.user.role === ROLES.PM) {
    const projects = await Project.find({ owner: req.user._id }).select('_id');
    const ownedProjectIds = projects.map((item) => item._id.toString());
    query.project = project && ownedProjectIds.includes(project) ? project : { $in: projects.map((item) => item._id) };
  }

  await Task.updateMany(
    { ...query, dueDate: { $lt: new Date() }, bragStatus: { $ne: 'Blue' } },
    { bragStatus: 'Red' }
  );

  const tasks = await populateTask(Task.find(query).sort({ dueDate: 1, updatedAt: -1 }));
  ok(res, { tasks });
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await populateTask(Task.findById(req.params.id));
  if (!task) throw new AppError('Task not found', 404);
  ok(res, { task });
});

export const createTask = asyncHandler(async (req, res) => {
  await ensureCanManageTask(req.user, req.body.project);
  const task = await Task.create(req.body);
  const populatedTask = await populateTask(Task.findById(task._id));
  created(res, { task: populatedTask }, 'Task created');
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError('Task not found', 404);
  await ensureCanManageTask(req.user, task.project);

  Object.assign(task, req.body);
  await task.save();
  const populatedTask = await populateTask(Task.findById(task._id));
  ok(res, { task: populatedTask }, 'Task updated');
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError('Task not found', 404);
  await ensureCanManageTask(req.user, task.project);
  await task.deleteOne();
  ok(res, null, 'Task deleted');
});

export const addComment = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError('Task not found', 404);

  const canComment =
    req.user.role !== ROLES.TEAM_MEMBER ||
    task.assignedTo?.toString() === req.user._id.toString();

  if (!canComment) throw new AppError('You can only comment on tasks assigned to you', 403);

  task.comments.push({ text: req.body.text, author: req.user._id });
  await task.save();
  const populatedTask = await populateTask(Task.findById(task._id));
  created(res, { task: populatedTask }, 'Comment added');
});
