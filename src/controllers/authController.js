import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { signToken } from '../utils/token.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { toApi } from '../utils/serialize.js';

const authPayload = (user, sessionId) => ({
  token: signToken(user.id || user._id, sessionId),
  user: {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    sessionTimeoutMinutes: user.sessionTimeoutMinutes || 30
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
  const sessionId = crypto.randomUUID();
  const sessionUser = await prisma.user.update({ where: { id: user.id }, data: { activeSessionId: sessionId } });
  created(res, authPayload(toApi(sessionUser), sessionId), 'Registration successful');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const sessionId = crypto.randomUUID();
  const sessionUser = await prisma.user.update({ where: { id: user.id }, data: { activeSessionId: sessionId } });
  ok(res, authPayload(toApi(sessionUser), sessionId), 'Login successful');
});

export const me = asyncHandler(async (req, res) => {
  ok(res, { user: req.user });
});

export const updateSessionSettings = asyncHandler(async (req, res) => {
  const minutes = Number(req.body.sessionTimeoutMinutes);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 720) {
    throw new AppError('Session timeout must be between 5 and 720 minutes', 422);
  }

  const user = await prisma.user.update({
    where: { id: req.user.id || req.user._id },
    data: { sessionTimeoutMinutes: minutes }
  });
  const { password: _password, activeSessionId: _activeSessionId, ...safeUser } = user;
  ok(res, { user: toApi(safeUser) }, 'Session settings updated');
});

export const logout = asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id || req.user._id },
    data: { activeSessionId: null }
  });
  ok(res, null, 'Logged out');
});
