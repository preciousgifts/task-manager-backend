import express from 'express';
import { body } from 'express-validator';
import {
  addPlanComment,
  createPlanItem,
  deletePlanItem,
  getPlanItems,
  updatePlanItem
} from '../controllers/planController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/errorMiddleware.js';
import { BRAG_STATUS, KNOWLEDGE_AREAS, PLAN_ITEM_TYPES, PRIORITIES, RACI_ROLES } from '../utils/constants.js';

const router = express.Router();

const planValidation = [
  body('project').notEmpty().withMessage('Project is required'),
  body('type').isIn(PLAN_ITEM_TYPES).withMessage('Invalid plan item type'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('knowledgeArea').optional().isIn(KNOWLEDGE_AREAS).withMessage('Invalid knowledge area'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('revisedDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Valid revised date is required'),
  body('bragStatus').optional().isIn(Object.values(BRAG_STATUS)).withMessage('Invalid BRAG status'),
  body('priority').optional().isIn(PRIORITIES).withMessage('Invalid priority'),
  body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be 0-100'),
  body('plannedCost').optional().isFloat({ min: 0 }).withMessage('Planned cost cannot be negative'),
  body('actualCost').optional().isFloat({ min: 0 }).withMessage('Actual cost cannot be negative'),
  body('raci.*.responsibility').optional().isIn(RACI_ROLES).withMessage('Invalid RACI responsibility')
];

router.use(protect);
router.get('/', getPlanItems);
router.post('/', planValidation, validate, createPlanItem);
router.patch('/:id', updatePlanItem);
router.delete('/:id', deletePlanItem);
router.post('/:id/comments', [body('text').trim().notEmpty().withMessage('Comment text is required')], validate, addPlanComment);

export default router;
