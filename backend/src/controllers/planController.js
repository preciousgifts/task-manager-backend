import PlanItem from '../models/PlanItem.js';
import Project from '../models/Project.js';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { BRAG_STATUS, PLAN_ITEM_TYPES, ROLES } from '../utils/constants.js';
import { ensureProjectAccess, ensureProjectManagerAccess } from '../utils/access.js';

const populatePlanItem = (query) =>
  query
    .populate('project', 'name owner planConfig costSummary')
    .populate('parent', 'title type')
    .populate('assignedTo', 'name email role')
    .populate('raci.user', 'name email role')
    .populate('comments.author', 'name email role');

const buildTree = (items) => {
  const byId = new Map(items.map((item) => [item._id.toString(), { ...item.toObject(), children: [] }]));
  const roots = [];

  byId.forEach((item) => {
    const parentId = item.parent?._id?.toString() || item.parent?.toString();
    if (parentId && byId.has(parentId)) byId.get(parentId).children.push(item);
    else roots.push(item);
  });

  return roots;
};

const syncProjectCost = async (projectId) => {
  const objectId = projectId instanceof mongoose.Types.ObjectId ? projectId : new mongoose.Types.ObjectId(projectId);
  const rows = await PlanItem.aggregate([
    { $match: { project: objectId } },
    {
      $group: {
        _id: '$project',
        plannedCost: { $sum: '$plannedCost' },
        actualCost: { $sum: '$actualCost' }
      }
    }
  ]);
  const summary = rows[0] || { plannedCost: 0, actualCost: 0 };
  await Project.findByIdAndUpdate(projectId, {
    costSummary: {
      plannedCost: summary.plannedCost,
      actualCost: summary.actualCost,
      variance: summary.actualCost - summary.plannedCost
    }
  });
};

const validateParent = async (payload) => {
  if (payload.type === 'Milestone' && payload.parent) {
    throw new AppError('Milestones cannot have a parent', 422);
  }
  if (payload.type !== 'Milestone' && !payload.parent) {
    throw new AppError('Work tasks and subtasks require a parent item', 422);
  }
  if (!payload.parent) return;

  const parent = await PlanItem.findById(payload.parent);
  if (!parent) throw new AppError('Parent plan item not found', 404);
  if (parent.project.toString() !== payload.project.toString()) {
    throw new AppError('Parent must belong to the same project', 422);
  }
  if (payload.type === 'Work Task' && parent.type !== 'Milestone') {
    throw new AppError('Work tasks must belong to a milestone', 422);
  }
  if (payload.type === 'Subtask' && parent.type !== 'Work Task') {
    throw new AppError('Subtasks must belong to a work task', 422);
  }
};

export const getPlanItems = asyncHandler(async (req, res) => {
  const { project, status, search, tree } = req.query;
  if (!project) throw new AppError('Project is required', 422);
  await ensureProjectAccess(req.user, project);
  await PlanItem.updateMany(
    { project, dueDate: { $lt: new Date() }, bragStatus: { $ne: BRAG_STATUS.BLUE } },
    { bragStatus: BRAG_STATUS.RED }
  );

  const query = { project };
  if (status) query.bragStatus = status;
  if (search) query.title = { $regex: search, $options: 'i' };
  if (req.user.role === ROLES.TEAM_MEMBER) query.assignedTo = req.user._id;

  const items = await populatePlanItem(PlanItem.find(query).sort({ startDate: 1, createdAt: 1 }));
  ok(res, { items: tree === 'true' ? buildTree(items) : items });
});

export const createPlanItem = asyncHandler(async (req, res) => {
  await ensureProjectManagerAccess(req.user, req.body.project);
  await validateParent(req.body);

  const item = await PlanItem.create(req.body);
  await syncProjectCost(item.project);
  const populatedItem = await populatePlanItem(PlanItem.findById(item._id));
  created(res, { item: populatedItem }, 'Plan item created');
});

export const updatePlanItem = asyncHandler(async (req, res) => {
  const item = await PlanItem.findById(req.params.id);
  if (!item) throw new AppError('Plan item not found', 404);

  if (req.user.role === ROLES.TEAM_MEMBER) {
    if (item.assignedTo?.toString() !== req.user._id.toString()) {
      throw new AppError('Team members can only update assigned plan items', 403);
    }
    const allowed = ['bragStatus', 'progress', 'comments'];
    Object.keys(req.body).forEach((key) => {
      if (!allowed.includes(key)) delete req.body[key];
    });
  } else {
    await ensureProjectManagerAccess(req.user, item.project);
    if (req.body.project) delete req.body.project;
    if (req.body.type && !PLAN_ITEM_TYPES.includes(req.body.type)) throw new AppError('Invalid plan item type', 422);
    if (req.body.parent !== undefined || req.body.type) {
      await validateParent({ ...item.toObject(), ...req.body, project: item.project });
    }
  }

  Object.assign(item, req.body);
  if (item.dueDate < new Date() && item.bragStatus !== BRAG_STATUS.BLUE) item.bragStatus = BRAG_STATUS.RED;
  await item.save();
  await syncProjectCost(item.project);
  const populatedItem = await populatePlanItem(PlanItem.findById(item._id));
  ok(res, { item: populatedItem }, 'Plan item updated');
});

export const deletePlanItem = asyncHandler(async (req, res) => {
  const item = await PlanItem.findById(req.params.id);
  if (!item) throw new AppError('Plan item not found', 404);
  await ensureProjectManagerAccess(req.user, item.project);

  const idsToDelete = [item._id];
  const children = await PlanItem.find({ parent: item._id }).select('_id');
  idsToDelete.push(...children.map((child) => child._id));
  const grandchildren = await PlanItem.find({ parent: { $in: children.map((child) => child._id) } }).select('_id');
  idsToDelete.push(...grandchildren.map((child) => child._id));

  await PlanItem.deleteMany({ _id: { $in: idsToDelete } });
  await syncProjectCost(item.project);
  ok(res, null, 'Plan item deleted');
});

export const addPlanComment = asyncHandler(async (req, res) => {
  const item = await PlanItem.findById(req.params.id);
  if (!item) throw new AppError('Plan item not found', 404);
  await ensureProjectAccess(req.user, item.project);

  if (req.user.role === ROLES.TEAM_MEMBER && item.assignedTo?.toString() !== req.user._id.toString()) {
    throw new AppError('Team members can only comment on assigned plan items', 403);
  }

  item.comments.push({ text: req.body.text, author: req.user._id });
  await item.save();
  const populatedItem = await populatePlanItem(PlanItem.findById(item._id));
  created(res, { item: populatedItem }, 'Comment added');
});
