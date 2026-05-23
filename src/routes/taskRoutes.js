import express from 'express';
import { body } from 'express-validator';
import {
  addComment,
  createTask,
  deleteTask,
  getTask,
  getTasks,
  updateTask
} from '../controllers/taskController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/errorMiddleware.js';
import { BRAG_STATUS, PRIORITIES, ROLES } from '../utils/constants.js';

const router = express.Router();
const managerRoles = [ROLES.ADMIN, ROLES.PM];

const taskValidation = [
  body('project').notEmpty().withMessage('Project is required'),
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('bragStatus').optional().isIn(Object.values(BRAG_STATUS)).withMessage('Invalid BRAG status'),
  body('priority').optional().isIn(PRIORITIES).withMessage('Invalid priority')
];

router.use(protect);
router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/', authorize(...managerRoles), taskValidation, validate, createTask);
router.patch('/:id', updateTask);
router.delete('/:id', authorize(...managerRoles), deleteTask);
router.post(
  '/:id/comments',
  [body('text').trim().notEmpty().withMessage('Comment text is required')],
  validate,
  addComment
);

export default router;
