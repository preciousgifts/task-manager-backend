import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../middleware/errorMiddleware.js';

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select('-password').sort({ name: 1 });
  ok(res, { users });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name, email: req.body.email, role: req.body.role },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) throw new AppError('User not found', 404);
  ok(res, { user }, 'User updated');
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  ok(res, null, 'User deleted');
});
