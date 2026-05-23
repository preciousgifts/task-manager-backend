import jwt from 'jsonwebtoken';

export const signToken = (userId, sessionId) =>
  jwt.sign({ id: userId, sessionId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
