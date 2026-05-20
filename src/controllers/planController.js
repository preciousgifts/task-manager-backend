import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { BRAG_STATUS, KNOWLEDGE_AREAS, PLAN_ITEM_TYPES, ROLES } from '../utils/constants.js';
import { ensureProjectAccess, ensureProjectManagerAccess } from '../utils/access.js';
import { toApi } from '../utils/serialize.js';

const planInclude = {
  project: { select: { id: true, name: true, ownerId: true, showCost: true, showRaci: true } },
  parent: { select: { id: true, title: true, type: true, knowledgeArea: true } },
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
  raci: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
  comments: { include: { author: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: 'asc' } }
};

const syncProjectCost = async (projectId) => {
  const aggregate = await prisma.planItem.aggregate({
    where: { projectId },
    _sum: { plannedCost: true, actualCost: true }
  });
  const plannedCost = aggregate._sum.plannedCost || 0;
  const actualCost = aggregate._sum.actualCost || 0;
  await prisma.project.update({
    where: { id: projectId },
    data: { plannedCost, actualCost, costVariance: actualCost - plannedCost }
  });
};

const buildTree = (items) => {
  const byId = new Map(items.map((item) => [item.id, { ...item, children: [] }]));
  const roots = [];
  byId.forEach((item) => {
    if (item.parentId && byId.has(item.parentId)) byId.get(item.parentId).children.push(item);
    else roots.push(item);
  });
  return roots;
};

const validateParent = async (payload) => {
  if (payload.type === 'Milestone' && payload.parentId) throw new AppError('Milestones cannot have a parent', 422);
  if (payload.type !== 'Milestone' && !payload.parentId) throw new AppError('Work tasks and subtasks require a parent item', 422);
  if (!payload.parentId) return;
  const parent = await prisma.planItem.findUnique({ where: { id: payload.parentId } });
  if (!parent) throw new AppError('Parent plan item not found', 404);
  if (parent.projectId !== payload.projectId) throw new AppError('Parent must belong to the same project', 422);
  if (parent.knowledgeArea !== payload.knowledgeArea) throw new AppError('Parent must belong to the same knowledge area', 422);
  if (payload.type === 'Work Task' && parent.type !== 'Milestone') throw new AppError('Work tasks must belong to a milestone', 422);
  if (payload.type === 'Subtask' && parent.type !== 'Work Task') throw new AppError('Subtasks must belong to a work task', 422);
};

const planData = (payload) => ({
  projectId: payload.project || payload.projectId,
  parentId: payload.parent !== undefined ? payload.parent : payload.parentId || null,
  type: payload.type,
  knowledgeArea: payload.knowledgeArea || 'Schedule',
  title: payload.title,
  description: payload.description ?? '',
  assignedToId: payload.assignedTo !== undefined ? payload.assignedTo : payload.assignedToId || null,
  startDate: new Date(payload.startDate),
  dueDate: new Date(payload.dueDate),
  revisedDate: payload.revisedDate !== undefined && payload.revisedDate !== null && payload.revisedDate !== '' ? new Date(payload.revisedDate) : null,
  bragStatus: payload.bragStatus ?? 'Green',
  priority: payload.priority ?? 'Medium',
  progress: Number(payload.progress ?? 0),
  plannedCost: Number(payload.plannedCost ?? 0),
  actualCost: Number(payload.actualCost ?? 0)
});

const markOverduePlanItems = (where) =>
  prisma.planItem.updateMany({
    where: { ...where, dueDate: { lt: new Date() }, bragStatus: { not: BRAG_STATUS.BLUE } },
    data: { bragStatus: BRAG_STATUS.RED }
  });

export const getPlanItems = asyncHandler(async (req, res) => {
  const { project, status, search, tree, knowledgeArea = 'Schedule' } = req.query;
  if (!project) throw new AppError('Project is required', 422);
  if (knowledgeArea && !KNOWLEDGE_AREAS.includes(knowledgeArea)) throw new AppError('Invalid knowledge area', 422);
  await ensureProjectAccess(req.user, project);

  const where = { projectId: project, knowledgeArea };
  if (status) where.bragStatus = status;
  if (search) where.title = { contains: search, mode: 'insensitive' };
  if (req.user.role === ROLES.TEAM_MEMBER) where.assignedToId = req.user.id || req.user._id;
  await markOverduePlanItems(where);

  const items = await prisma.planItem.findMany({ where, include: planInclude, orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }] });
  ok(res, { items: toApi(tree === 'true' ? buildTree(items) : items) });
});

export const createPlanItem = asyncHandler(async (req, res) => {
  await ensureProjectManagerAccess(req.user, req.body.project);
  const data = planData(req.body);
  if (!KNOWLEDGE_AREAS.includes(data.knowledgeArea)) throw new AppError('Invalid knowledge area', 422);
  await validateParent(data);
  if (data.dueDate < new Date() && data.bragStatus !== BRAG_STATUS.BLUE) data.bragStatus = BRAG_STATUS.RED;

  const raci = Array.isArray(req.body.raci) ? req.body.raci : [];
  const item = await prisma.planItem.create({
    data: {
      ...data,
      raci: {
        create: raci.filter((entry) => entry.user).map((entry) => ({ userId: entry.user, responsibility: entry.responsibility }))
      }
    },
    include: planInclude
  });
  await syncProjectCost(item.projectId);
  created(res, { item: toApi(item) }, 'Plan item created');
});

export const updatePlanItem = asyncHandler(async (req, res) => {
  const existing = await prisma.planItem.findUnique({ where: { id: req.params.id }, include: { raci: true } });
  if (!existing) throw new AppError('Plan item not found', 404);
  let data;

  if (req.user.role === ROLES.TEAM_MEMBER) {
    if (existing.assignedToId !== (req.user.id || req.user._id)) throw new AppError('Team members can only update assigned plan items', 403);
    data = {
      bragStatus: req.body.bragStatus ?? existing.bragStatus,
      progress: Number(req.body.progress ?? existing.progress)
    };
  } else {
    await ensureProjectManagerAccess(req.user, existing.projectId);
    if (req.body.type && !PLAN_ITEM_TYPES.includes(req.body.type)) throw new AppError('Invalid plan item type', 422);
    data = planData({ ...existing, ...req.body, project: existing.projectId });
    if (!KNOWLEDGE_AREAS.includes(data.knowledgeArea)) throw new AppError('Invalid knowledge area', 422);
    await validateParent(data);
  }

  if (data.dueDate && data.dueDate < new Date() && data.bragStatus !== BRAG_STATUS.BLUE) data.bragStatus = BRAG_STATUS.RED;

  const item = await prisma.$transaction(async (tx) => {
    if (req.user.role !== ROLES.TEAM_MEMBER && Array.isArray(req.body.raci)) {
      await tx.raciAssignment.deleteMany({ where: { planItemId: existing.id } });
    }
    return tx.planItem.update({
      where: { id: existing.id },
      data: {
        ...data,
        ...(req.user.role !== ROLES.TEAM_MEMBER && Array.isArray(req.body.raci)
          ? { raci: { create: req.body.raci.filter((entry) => entry.user).map((entry) => ({ userId: entry.user, responsibility: entry.responsibility })) } }
          : {})
      },
      include: planInclude
    });
  });

  await syncProjectCost(item.projectId);
  ok(res, { item: toApi(item) }, 'Plan item updated');
});

export const deletePlanItem = asyncHandler(async (req, res) => {
  const item = await prisma.planItem.findUnique({ where: { id: req.params.id } });
  if (!item) throw new AppError('Plan item not found', 404);
  await ensureProjectManagerAccess(req.user, item.projectId);
  const children = await prisma.planItem.findMany({ where: { parentId: item.id }, select: { id: true } });
  const grandchildren = await prisma.planItem.findMany({ where: { parentId: { in: children.map((child) => child.id) } }, select: { id: true } });
  await prisma.planItem.deleteMany({ where: { id: { in: [...grandchildren.map((child) => child.id), ...children.map((child) => child.id), item.id] } } });
  await syncProjectCost(item.projectId);
  ok(res, null, 'Plan item deleted');
});

export const addPlanComment = asyncHandler(async (req, res) => {
  const item = await prisma.planItem.findUnique({ where: { id: req.params.id } });
  if (!item) throw new AppError('Plan item not found', 404);
  await ensureProjectAccess(req.user, item.projectId);
  if (req.user.role === ROLES.TEAM_MEMBER && item.assignedToId !== (req.user.id || req.user._id)) {
    throw new AppError('Team members can only comment on assigned plan items', 403);
  }

  await prisma.planComment.create({ data: { planItemId: item.id, text: req.body.text, authorId: req.user.id || req.user._id } });
  const populatedItem = await prisma.planItem.findUnique({ where: { id: item.id }, include: planInclude });
  created(res, { item: toApi(populatedItem) }, 'Comment added');
});
