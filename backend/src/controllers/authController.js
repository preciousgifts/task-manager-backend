import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { signToken } from '../utils/token.js';
import { AppError } from '../middleware/errorMiddleware.js';

const authPayload = (user) => ({
  token: signToken(user._id),
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

export const register = asyncHandler(async (req, res) => {
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) throw new AppError('Email is already registered', 409);

  const user = await User.create(req.body);
  created(res, authPayload(user), 'Registration successful');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  ok(res, authPayload(user), 'Login successful');
});

export const me = asyncHandler(async (req, res) => {
  ok(res, { user: req.user });
});
