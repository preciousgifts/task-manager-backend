import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { toApi } from '../utils/serialize.js';

const publicUser = (user) => {
  if (!user) return user;
  const { password: _password, activeSessionId: _activeSessionId, ...safeUser } = user;
  return toApi(safeUser);
};

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  ok(res, { users: users.map(publicUser) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = {
    name: req.body.name,
    email: req.body.email?.toLowerCase(),
    role: req.body.role
  };
  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  if (req.body.password) data.password = await bcrypt.hash(req.body.password, 12);

  const user = await prisma.user.update({ where: { id: req.params.id }, data }).catch(() => null);
  if (!user) throw new AppError('User not found', 404);
  ok(res, { user: publicUser(user) }, 'User updated');
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.delete({ where: { id: req.params.id } }).catch(() => null);
  if (!user) throw new AppError('User not found', 404);
  ok(res, null, 'User deleted');
});
