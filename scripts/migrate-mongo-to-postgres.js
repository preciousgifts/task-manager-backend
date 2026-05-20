import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma.js';

const mongoUri = process.env.MONGODB_URI;

const User = mongoose.model('MigrationUser', new mongoose.Schema({}, { strict: false, collection: 'users' }));
const Project = mongoose.model('MigrationProject', new mongoose.Schema({}, { strict: false, collection: 'projects' }));
const Task = mongoose.model('MigrationTask', new mongoose.Schema({}, { strict: false, collection: 'tasks' }));
const PlanItem = mongoose.model('MigrationPlanItem', new mongoose.Schema({}, { strict: false, collection: 'planitems' }));
const RaidItem = mongoose.model('MigrationRaidItem', new mongoose.Schema({}, { strict: false, collection: 'raiditems' }));

const id = (value) => value ? value.toString() : null;
const date = (value) => value ? new Date(value) : null;

const main = async () => {
  if (!mongoUri) throw new Error('MONGODB_URI is required for migration');
  await mongoose.connect(mongoUri);
  await prisma.$connect();

  const users = await User.find().lean();
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: id(user._id) },
      create: {
        id: id(user._id),
        name: user.name,
        email: user.email,
        password: user.password || await bcrypt.hash('ChangeMe123!', 12),
        role: user.role || 'Team Member',
        createdAt: date(user.createdAt) || new Date(),
        updatedAt: date(user.updatedAt) || new Date()
      },
      update: {
        name: user.name,
        email: user.email,
        password: user.password || await bcrypt.hash('ChangeMe123!', 12),
        role: user.role || 'Team Member'
      }
    });
  }

  const projects = await Project.find().lean();
  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: id(project._id) },
      create: {
        id: id(project._id),
        name: project.name,
        description: project.description || '',
        ownerId: id(project.owner),
        startDate: date(project.startDate) || new Date(),
        endDate: date(project.endDate) || new Date(),
        bragStatus: project.bragStatus || 'Green',
        progress: project.progress || 0,
        showDescription: project.planConfig?.showDescription ?? true,
        showAssignee: project.planConfig?.showAssignee ?? true,
        showDates: project.planConfig?.showDates ?? true,
        showBragStatus: project.planConfig?.showBragStatus ?? true,
        showPriority: project.planConfig?.showPriority ?? true,
        showProgress: project.planConfig?.showProgress ?? true,
        showCost: project.planConfig?.showCost ?? false,
        showRaci: project.planConfig?.showRaci ?? false,
        plannedCost: project.costSummary?.plannedCost || 0,
        actualCost: project.costSummary?.actualCost || 0,
        costVariance: project.costSummary?.variance || 0,
        createdAt: date(project.createdAt) || new Date(),
        updatedAt: date(project.updatedAt) || new Date()
      },
      update: {}
    });
  }

  const tasks = await Task.find().lean();
  for (const task of tasks) {
    await prisma.task.upsert({
      where: { id: id(task._id) },
      create: {
        id: id(task._id),
        projectId: id(task.project),
        title: task.title,
        description: task.description || '',
        assignedToId: id(task.assignedTo),
        startDate: date(task.startDate) || new Date(),
        dueDate: date(task.dueDate) || new Date(),
        bragStatus: task.bragStatus || 'Green',
        priority: task.priority || 'Medium',
        createdAt: date(task.createdAt) || new Date(),
        updatedAt: date(task.updatedAt) || new Date()
      },
      update: {}
    });
    for (const comment of task.comments || []) {
      await prisma.taskComment.upsert({
        where: { id: id(comment._id) },
        create: {
          id: id(comment._id),
          taskId: id(task._id),
          text: comment.text,
          authorId: id(comment.author),
          createdAt: date(comment.createdAt) || new Date(),
          updatedAt: date(comment.updatedAt) || new Date()
        },
        update: {}
      });
    }
  }

  const planItems = await PlanItem.find().lean();
  for (const item of planItems) {
    await prisma.planItem.upsert({
      where: { id: id(item._id) },
      create: {
        id: id(item._id),
        projectId: id(item.project),
        parentId: null,
        type: item.type,
        knowledgeArea: item.knowledgeArea || 'Schedule',
        title: item.title,
        description: item.description || '',
        assignedToId: id(item.assignedTo),
        startDate: date(item.startDate) || new Date(),
        dueDate: date(item.dueDate) || new Date(),
        revisedDate: date(item.revisedDate),
        bragStatus: item.bragStatus || 'Green',
        priority: item.priority || 'Medium',
        progress: item.progress || 0,
        plannedCost: item.plannedCost || 0,
        actualCost: item.actualCost || 0,
        createdAt: date(item.createdAt) || new Date(),
        updatedAt: date(item.updatedAt) || new Date()
      },
      update: {}
    });
  }
  for (const item of planItems) {
    if (item.parent) {
      await prisma.planItem.update({
        where: { id: id(item._id) },
        data: { parentId: id(item.parent) }
      }).catch(() => null);
    }
    for (const assignment of item.raci || []) {
      await prisma.raciAssignment.create({
        data: {
          planItemId: id(item._id),
          userId: id(assignment.user),
          responsibility: assignment.responsibility
        }
      }).catch(() => null);
    }
    for (const comment of item.comments || []) {
      await prisma.planComment.upsert({
        where: { id: id(comment._id) },
        create: {
          id: id(comment._id),
          planItemId: id(item._id),
          text: comment.text,
          authorId: id(comment.author),
          createdAt: date(comment.createdAt) || new Date(),
          updatedAt: date(comment.updatedAt) || new Date()
        },
        update: {}
      });
    }
  }

  const raids = await RaidItem.find().lean();
  for (const raid of raids) {
    await prisma.raidItem.upsert({
      where: { id: id(raid._id) },
      create: {
        id: id(raid._id),
        projectId: id(raid.project),
        type: raid.type,
        title: raid.title,
        description: raid.description || '',
        ownerId: id(raid.owner),
        dueDate: date(raid.dueDate),
        status: raid.status || 'Open',
        priority: raid.priority || 'Medium',
        impact: raid.impact || 'Medium',
        mitigation: raid.mitigation || '',
        createdAt: date(raid.createdAt) || new Date(),
        updatedAt: date(raid.updatedAt) || new Date()
      },
      update: {}
    });
  }

  console.log(`Migrated ${users.length} users, ${projects.length} projects, ${tasks.length} tasks, ${planItems.length} plan items, ${raids.length} RAIDS items.`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    await prisma.$disconnect();
  });
