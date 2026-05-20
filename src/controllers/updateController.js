import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { BRAG_STATUS } from '../utils/constants.js';
import { getAccessibleProjectIds } from '../utils/access.js';
import { toApi } from '../utils/serialize.js';

export const getUpdates = asyncHandler(async (req, res) => {
  const accessibleProjectIds = await getAccessibleProjectIds(req.user);
  const projectFilter = accessibleProjectIds ? { projectId: { in: accessibleProjectIds } } : {};
  const statusFilter = { bragStatus: { in: [BRAG_STATUS.RED, BRAG_STATUS.AMBER] } };

  await Promise.all([
    prisma.task.updateMany({ where: { ...projectFilter, dueDate: { lt: new Date() }, bragStatus: { not: BRAG_STATUS.BLUE } }, data: { bragStatus: BRAG_STATUS.RED } }),
    prisma.planItem.updateMany({ where: { ...projectFilter, dueDate: { lt: new Date() }, bragStatus: { not: BRAG_STATUS.BLUE } }, data: { bragStatus: BRAG_STATUS.RED } })
  ]);

  const [tasks, planItems] = await Promise.all([
    prisma.task.findMany({
      where: { ...projectFilter, ...statusFilter },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { dueDate: 'asc' }
    }),
    prisma.planItem.findMany({
      where: { ...projectFilter, ...statusFilter },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        parent: { select: { id: true, title: true, type: true } }
      },
      orderBy: { dueDate: 'asc' }
    })
  ]);

  ok(res, {
    updates: toApi([
      ...tasks.map((task) => ({ source: 'Task', item: task })),
      ...planItems.map((item) => ({ source: 'Project Plan', item }))
    ].sort((a, b) => new Date(a.item.dueDate) - new Date(b.item.dueDate)))
  });
});
