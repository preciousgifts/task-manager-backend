import RaidItem from '../models/RaidItem.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { ensureProjectAccess, ensureProjectManagerAccess } from '../utils/access.js';

const populateRaid = (query) => query.populate('project', 'name').populate('owner', 'name email role');

export const getRaidItems = asyncHandler(async (req, res) => {
  const { project, type, status } = req.query;
  if (!project) throw new AppError('Project is required', 422);
  await ensureProjectAccess(req.user, project);
  const query = { project };
  if (type) query.type = type;
  if (status) query.status = status;
  const items = await populateRaid(RaidItem.find(query).sort({ dueDate: 1, updatedAt: -1 }));
  ok(res, { items });
});

export const createRaidItem = asyncHandler(async (req, res) => {
  await ensureProjectManagerAccess(req.user, req.body.project);
  const item = await RaidItem.create(req.body);
  const populatedItem = await populateRaid(RaidItem.findById(item._id));
  created(res, { item: populatedItem }, 'RAIDS item created');
});

export const updateRaidItem = asyncHandler(async (req, res) => {
  const item = await RaidItem.findById(req.params.id);
  if (!item) throw new AppError('RAIDS item not found', 404);
  await ensureProjectManagerAccess(req.user, item.project);
  Object.assign(item, req.body);
  await item.save();
  const populatedItem = await populateRaid(RaidItem.findById(item._id));
  ok(res, { item: populatedItem }, 'RAIDS item updated');
});

export const deleteRaidItem = asyncHandler(async (req, res) => {
  const item = await RaidItem.findById(req.params.id);
  if (!item) throw new AppError('RAIDS item not found', 404);
  await ensureProjectManagerAccess(req.user, item.project);
  await item.deleteOne();
  ok(res, null, 'RAIDS item deleted');
});
