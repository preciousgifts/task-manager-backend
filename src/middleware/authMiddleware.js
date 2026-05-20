import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { AppError } from './errorMiddleware.js';
import { toApi } from '../utils/serialize.js';

export const protect = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Authentication token required', 401);
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) throw new AppError('User no longer exists', 401);

    const { password: _password, ...safeUser } = user;
    req.user = toApi(safeUser);
    next();
  } catch (error) {
    next(error.statusCode ? error : new AppError('Invalid or expired token', 401));
  }
};

export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};
