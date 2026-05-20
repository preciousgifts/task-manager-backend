import PlanItem from '../models/PlanItem.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { BRAG_STATUS } from '../utils/constants.js';
import { getAccessibleProjectIds } from '../utils/access.js';

export const getUpdates = asyncHandler(async (req, res) => {
  const accessibleProjectIds = await getAccessibleProjectIds(req.user);
  const projectFilter = accessibleProjectIds ? { project: { $in: accessibleProjectIds } } : {};
  const statusFilter = { bragStatus: { $in: [BRAG_STATUS.RED, BRAG_STATUS.AMBER] } };

  await Promise.all([
    Task.updateMany({ ...projectFilter, dueDate: { $lt: new Date() }, bragStatus: { $ne: BRAG_STATUS.BLUE } }, { bragStatus: BRAG_STATUS.RED }),
    PlanItem.updateMany({ ...projectFilter, dueDate: { $lt: new Date() }, bragStatus: { $ne: BRAG_STATUS.BLUE } }, { bragStatus: BRAG_STATUS.RED })
  ]);

  const [tasks, planItems] = await Promise.all([
    Task.find({ ...projectFilter, ...statusFilter })
      .populate('project', 'name')
      .populate('assignedTo', 'name email role')
      .sort({ dueDate: 1 }),
    PlanItem.find({ ...projectFilter, ...statusFilter })
      .populate('project', 'name')
      .populate('assignedTo', 'name email role')
      .populate('parent', 'title type')
      .sort({ dueDate: 1 })
  ]);

  ok(res, {
    updates: [
      ...tasks.map((task) => ({ source: 'Task', item: task })),
      ...planItems.map((item) => ({ source: 'Project Plan', item }))
    ].sort((a, b) => new Date(a.item.dueDate) - new Date(b.item.dueDate))
  });
});
