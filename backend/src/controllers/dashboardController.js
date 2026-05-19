import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { BRAG_STATUS, ROLES } from '../utils/constants.js';

const countByStatus = async (Model, baseQuery = {}) => {
  const rows = await Model.aggregate([
    { $match: baseQuery },
    { $group: { _id: '$bragStatus', count: { $sum: 1 } } }
  ]);
  return Object.values(BRAG_STATUS).reduce((acc, status) => {
    acc[status] = rows.find((row) => row._id === status)?.count || 0;
    return acc;
  }, {});
};

export const getSummary = asyncHandler(async (req, res) => {
  const projectQuery = {};
  const taskQuery = {};

  if (req.user.role === ROLES.PM) {
    const ownedProjects = await Project.find({ owner: req.user._id }).select('_id');
    const ids = ownedProjects.map((project) => project._id);
    projectQuery._id = { $in: ids };
    taskQuery.project = { $in: ids };
  }

  if (req.user.role === ROLES.TEAM_MEMBER) {
    taskQuery.assignedTo = req.user._id;
    const assignedProjectIds = await Task.distinct('project', taskQuery);
    projectQuery._id = { $in: assignedProjectIds };
  }

  const [totalProjects, totalTasks, projectStatus, taskStatus, overdueTasks] = await Promise.all([
    Project.countDocuments(projectQuery),
    Task.countDocuments(taskQuery),
    countByStatus(Project, projectQuery),
    countByStatus(Task, taskQuery),
    Task.countDocuments({
      ...taskQuery,
      dueDate: { $lt: new Date() },
      bragStatus: { $ne: BRAG_STATUS.BLUE }
    })
  ]);

  ok(res, {
    summary: {
      totalProjects,
      totalTasks,
      completedTasks: taskStatus.Blue,
      delayedTasks: taskStatus.Red,
      threatenedTasks: taskStatus.Amber,
      onTrackTasks: taskStatus.Green,
      overdueTasks,
      projectStatus,
      taskStatus
    }
  });
});
