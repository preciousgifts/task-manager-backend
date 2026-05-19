import express from 'express';
import { body } from 'express-validator';
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject
} from '../controllers/projectController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/errorMiddleware.js';
import { BRAG_STATUS, ROLES } from '../utils/constants.js';

const router = express.Router();
const managerRoles = [ROLES.ADMIN, ROLES.PM];

const projectValidation = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('bragStatus').optional().isIn(Object.values(BRAG_STATUS)).withMessage('Invalid BRAG status'),
  body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be 0-100')
];

router.use(protect);
router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/', authorize(...managerRoles), projectValidation, validate, createProject);
router.patch('/:id', authorize(...managerRoles), updateProject);
router.delete('/:id', authorize(...managerRoles), deleteProject);

export default router;
