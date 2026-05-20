import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { ensureProjectAccess, ensureProjectManagerAccess } from '../utils/access.js';
import { toApi } from '../utils/serialize.js';

const raidInclude = {
  project: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true, email: true, role: true } }
};

const raidData = (payload) => ({
  projectId: payload.project || payload.projectId,
  type: payload.type,
  title: payload.title,
  description: payload.description ?? '',
  ownerId: payload.owner !== undefined ? payload.owner : payload.ownerId || null,
  dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
  status: payload.status ?? 'Open',
  priority: payload.priority ?? 'Medium',
  impact: payload.impact ?? 'Medium',
  mitigation: payload.mitigation ?? ''
});

export const getRaidItems = asyncHandler(async (req, res) => {
  const { project, type, status } = req.query;
  if (!project) throw new AppError('Project is required', 422);
  await ensureProjectAccess(req.user, project);
  const where = { projectId: project };
  if (type) where.type = type;
  if (status) where.status = status;
  const items = await prisma.raidItem.findMany({ where, include: raidInclude, orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }] });
  ok(res, { items: toApi(items) });
});

export const createRaidItem = asyncHandler(async (req, res) => {
  await ensureProjectManagerAccess(req.user, req.body.project);
  const item = await prisma.raidItem.create({ data: raidData(req.body), include: raidInclude });
  created(res, { item: toApi(item) }, 'RAIDS item created');
});

export const updateRaidItem = asyncHandler(async (req, res) => {
  const existing = await prisma.raidItem.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('RAIDS item not found', 404);
  await ensureProjectManagerAccess(req.user, existing.projectId);
  const item = await prisma.raidItem.update({ where: { id: req.params.id }, data: raidData({ ...existing, ...req.body, project: existing.projectId }), include: raidInclude });
  ok(res, { item: toApi(item) }, 'RAIDS item updated');
});

export const deleteRaidItem = asyncHandler(async (req, res) => {
  const item = await prisma.raidItem.findUnique({ where: { id: req.params.id } });
  if (!item) throw new AppError('RAIDS item not found', 404);
  await ensureProjectManagerAccess(req.user, item.projectId);
  await prisma.raidItem.delete({ where: { id: req.params.id } });
  ok(res, null, 'RAIDS item deleted');
});
