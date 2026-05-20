import express from 'express';
import { body } from 'express-validator';
import { deleteUser, getUsers, updateUser } from '../controllers/userController.js';
import { authorize, protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/errorMiddleware.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

router.use(protect);
router.get('/', getUsers);
router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  [body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role')],
  validate,
  updateUser
);
router.delete('/:id', authorize(ROLES.ADMIN), deleteUser);

export default router;
