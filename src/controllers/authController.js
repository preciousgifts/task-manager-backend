import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { signToken } from '../utils/token.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { toApi } from '../utils/serialize.js';

const authPayload = (user) => ({
  token: signToken(user.id || user._id),
  user: {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

export const register = asyncHandler(async (req, res) => {
  const existingUser = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (existingUser) throw new AppError('Email is already registered', 409);

  const user = await prisma.user.create({
    data: {
      name: req.body.name,
      email: req.body.email.toLowerCase(),
      password: await bcrypt.hash(req.body.password, 12),
      role: req.body.role || 'Team Member'
    }
  });
  created(res, authPayload(toApi(user)), 'Registration successful');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid email or password', 401);
  }

  ok(res, authPayload(toApi(user)), 'Login successful');
});

export const me = asyncHandler(async (req, res) => {
  ok(res, { user: req.user });
});
