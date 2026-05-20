import multer from 'multer';
import ExcelJS from 'exceljs';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { KNOWLEDGE_AREAS, RACI_ROLES, RAID_STATUSES, RAID_TYPES, ROLES } from '../utils/constants.js';
import { projectData, toApi } from '../utils/serialize.js';
import { ensureProjectAccess, ensureProjectManagerAccess } from '../utils/access.js';

export const uploadImport = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const projectInclude = { owner: { select: { id: true, name: true, email: true, role: true } } };

const projectWhere = async (user, { status, search }) => {
  const where = {};
  if (status) where.bragStatus = status;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  if (user.role === ROLES.PM) where.ownerId = user.id || user._id;
  if (user.role === ROLES.TEAM_MEMBER) {
    const [taskProjects, planProjects] = await Promise.all([
      prisma.task.findMany({ where: { assignedToId: user.id || user._id }, select: { projectId: true } }),
      prisma.planItem.findMany({ where: { assignedToId: user.id || user._id }, select: { projectId: true } })
    ]);
    where.id = { in: [...new Set([...taskProjects, ...planProjects].map((item) => item.projectId))] };
  }
  return where;
};

export const getProjects = asyncHandler(async (req, res) => {
  const where = await projectWhere(req.user, req.query);
  const projects = await prisma.project.findMany({ where, include: projectInclude, orderBy: { updatedAt: 'desc' } });
  ok(res, { projects: toApi(projects) });
});

export const getProject = asyncHandler(async (req, res) => {
  await ensureProjectAccess(req.user, req.params.id);
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: projectInclude });
  ok(res, { project: toApi(project) });
});

export const createProject = asyncHandler(async (req, res) => {
  const ownerId = req.user.role === ROLES.ADMIN ? req.body.owner || req.user.id || req.user._id : req.user.id || req.user._id;
  const data = projectData({ ...req.body, owner: ownerId });
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  const project = await prisma.project.create({
    data: {
      description: '',
      bragStatus: 'Green',
      progress: 0,
      showDescription: true,
      showAssignee: true,
      showDates: true,
      showBragStatus: true,
      showPriority: true,
      showProgress: true,
      showCost: false,
      showRaci: false,
      ...data
    },
    include: projectInclude
  });
  created(res, { project: toApi(project) }, 'Project created');
});

export const updateProject = asyncHandler(async (req, res) => {
  await ensureProjectManagerAccess(req.user, req.params.id);
  const data = projectData({ ...req.body, owner: undefined });
  delete data.ownerId;
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  const project = await prisma.project.update({ where: { id: req.params.id }, data, include: projectInclude });
  ok(res, { project: toApi(project) }, 'Project updated');
});

export const deleteProject = asyncHandler(async (req, res) => {
  await ensureProjectManagerAccess(req.user, req.params.id);
  await prisma.project.delete({ where: { id: req.params.id } });
  ok(res, null, 'Project and related tasks deleted');
});

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

export const exportProjectWorkbook = asyncHandler(async (req, res) => {
  await ensureProjectAccess(req.user, req.params.id);
  const [project, planItems, raids] = await Promise.all([
    prisma.project.findUnique({ where: { id: req.params.id } }),
    prisma.planItem.findMany({
      where: { projectId: req.params.id },
      include: { assignedTo: true, parent: true, raci: { include: { user: true } } },
      orderBy: [{ knowledgeArea: 'asc' }, { startDate: 'asc' }]
    }),
    prisma.raidItem.findMany({ where: { projectId: req.params.id }, include: { owner: true }, orderBy: { updatedAt: 'desc' } })
  ]);
  if (!project) throw new AppError('Project not found', 404);

  const workbook = new ExcelJS.Workbook();
  const addSheet = (name, rows) => {
    const sheet = workbook.addWorksheet(name);
    if (!rows.length) return sheet;
    sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: Math.max(14, key.length + 2) }));
    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true };
    return sheet;
  };

  addSheet('Plans', planItems.map((item) => ({
    id: item.id,
    knowledgeArea: item.knowledgeArea,
    type: item.type,
    parentId: item.parentId || '',
    parentTitle: item.parent?.title || '',
    title: item.title,
    description: item.description,
    assignedToEmail: item.assignedTo?.email || '',
    startDate: item.startDate.toISOString().slice(0, 10),
    dueDate: item.dueDate.toISOString().slice(0, 10),
    revisedDate: item.revisedDate ? item.revisedDate.toISOString().slice(0, 10) : '',
    bragStatus: item.bragStatus,
    priority: item.priority,
    progress: item.progress,
    plannedCost: item.plannedCost,
    actualCost: item.actualCost
  })));
  addSheet('RACI', planItems.flatMap((item) => item.raci.map((assignment) => ({
    planItemId: item.id,
    planItemTitle: item.title,
    userEmail: assignment.user.email,
    responsibility: assignment.responsibility
  }))));
  addSheet('RAIDS', raids.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    ownerEmail: item.owner?.email || '',
    dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : '',
    status: item.status,
    priority: item.priority,
    impact: item.impact,
    mitigation: item.mitigation
  })));

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-export.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(Buffer.from(buffer));
});

export const importProjectWorkbook = asyncHandler(async (req, res) => {
  await ensureProjectManagerAccess(req.user, req.params.id);
  if (!req.file) throw new AppError('Workbook file is required', 422);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  const cellValue = (value) => {
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('text' in value) return value.text;
      if ('result' in value) return value.result;
      if ('richText' in value) return value.richText.map((part) => part.text).join('');
    }
    return value;
  };
  const sheet = (name) => {
    const worksheet = workbook.getWorksheet(name);
    if (!worksheet) return [];
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => headers[colNumber] = String(cell.value || '').trim());
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const item = {};
      headers.forEach((header, colNumber) => {
        if (!header) return;
        item[header] = cellValue(row.getCell(colNumber).value) ?? '';
      });
      if (Object.values(item).some((value) => value !== '')) rows.push(item);
    });
    return rows;
  };
  const planRows = sheet('Plans');
  const raciRows = sheet('RACI');
  const raidRows = sheet('RAIDS');
  const users = await prisma.user.findMany();
  const userByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));

  let planCreated = 0;
  let planUpdated = 0;
  let raidsCreated = 0;
  let raidsUpdated = 0;

  await prisma.$transaction(async (tx) => {
    const parentLinks = [];
    for (const row of planRows) {
      if (!row.title || !row.type) throw new AppError('Plan rows require title and type', 422);
      if (row.knowledgeArea && !KNOWLEDGE_AREAS.includes(row.knowledgeArea)) throw new AppError(`Invalid knowledge area: ${row.knowledgeArea}`, 422);
      const assignedTo = row.assignedToEmail ? userByEmail.get(String(row.assignedToEmail).toLowerCase()) : null;
      const data = {
        projectId: req.params.id,
        knowledgeArea: row.knowledgeArea || 'Schedule',
        type: row.type,
        parentId: null,
        title: row.title,
        description: row.description || '',
        assignedToId: assignedTo?.id || null,
        startDate: new Date(row.startDate),
        dueDate: new Date(row.dueDate),
        revisedDate: row.revisedDate ? new Date(row.revisedDate) : null,
        bragStatus: row.bragStatus || 'Green',
        priority: row.priority || 'Medium',
        progress: Number(row.progress || 0),
        plannedCost: Number(row.plannedCost || 0),
        actualCost: Number(row.actualCost || 0)
      };
      if (row.id && await tx.planItem.findUnique({ where: { id: String(row.id) } })) {
        await tx.planItem.update({ where: { id: String(row.id) }, data });
        planUpdated += 1;
      } else {
        await tx.planItem.create({ data: row.id ? { ...data, id: String(row.id) } : data });
        planCreated += 1;
      }
      if (row.id && row.parentId) parentLinks.push({ id: String(row.id), parentId: String(row.parentId) });
    }

    for (const link of parentLinks) {
      const [item, parent] = await Promise.all([
        tx.planItem.findUnique({ where: { id: link.id } }),
        tx.planItem.findUnique({ where: { id: link.parentId } })
      ]);
      if (!item || !parent || item.projectId !== req.params.id || parent.projectId !== req.params.id) {
        throw new AppError(`Invalid parent relationship for plan item ${link.id}`, 422);
      }
      if (item.knowledgeArea !== parent.knowledgeArea) {
        throw new AppError(`Parent knowledge area mismatch for plan item ${link.id}`, 422);
      }
      await tx.planItem.update({ where: { id: link.id }, data: { parentId: link.parentId } });
    }

    for (const row of raciRows) {
      if (!row.planItemId || !row.userEmail || !row.responsibility) continue;
      if (!RACI_ROLES.includes(row.responsibility)) throw new AppError(`Invalid RACI role: ${row.responsibility}`, 422);
      const user = userByEmail.get(String(row.userEmail).toLowerCase());
      if (!user) continue;
      await tx.raciAssignment.deleteMany({ where: { planItemId: String(row.planItemId), userId: user.id, responsibility: row.responsibility } });
      await tx.raciAssignment.create({ data: { planItemId: String(row.planItemId), userId: user.id, responsibility: row.responsibility } });
    }

    for (const row of raidRows) {
      if (!row.title || !row.type) throw new AppError('RAIDS rows require title and type', 422);
      if (!RAID_TYPES.includes(row.type)) throw new AppError(`Invalid RAIDS type: ${row.type}`, 422);
      if (row.status && !RAID_STATUSES.includes(row.status)) throw new AppError(`Invalid RAIDS status: ${row.status}`, 422);
      const owner = row.ownerEmail ? userByEmail.get(String(row.ownerEmail).toLowerCase()) : null;
      const data = {
        projectId: req.params.id,
        type: row.type,
        title: row.title,
        description: row.description || '',
        ownerId: owner?.id || null,
        dueDate: row.dueDate ? new Date(row.dueDate) : null,
        status: row.status || 'Open',
        priority: row.priority || 'Medium',
        impact: row.impact || 'Medium',
        mitigation: row.mitigation || ''
      };
      if (row.id && await tx.raidItem.findUnique({ where: { id: String(row.id) } })) {
        await tx.raidItem.update({ where: { id: String(row.id) }, data });
        raidsUpdated += 1;
      } else {
        await tx.raidItem.create({ data: row.id ? { ...data, id: String(row.id) } : data });
        raidsCreated += 1;
      }
    }
  });

  await syncProjectCost(req.params.id);
  ok(res, { imported: { planCreated, planUpdated, raidsCreated, raidsUpdated } }, 'Workbook imported');
});
