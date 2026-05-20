import express from 'express';
import { body } from 'express-validator';
import { createRaidItem, deleteRaidItem, getRaidItems, updateRaidItem } from '../controllers/raidController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/errorMiddleware.js';
import { RAID_STATUSES, RAID_TYPES } from '../utils/constants.js';

const router = express.Router();

const raidValidation = [
  body('project').notEmpty().withMessage('Project is required'),
  body('type').isIn(RAID_TYPES).withMessage('Invalid RAIDS type'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('status').optional().isIn(RAID_STATUSES).withMessage('Invalid RAIDS status')
];

router.use(protect);
router.get('/', getRaidItems);
router.post('/', raidValidation, validate, createRaidItem);
router.patch('/:id', updateRaidItem);
router.delete('/:id', deleteRaidItem);

export default router;
