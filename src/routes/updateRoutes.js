import express from 'express';
import { getUpdates } from '../controllers/updateController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getUpdates);

export default router;
