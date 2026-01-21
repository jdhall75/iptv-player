import { Context, Next } from 'hono';
import { verifyToken } from '../utils/jwt';
import { findUserById } from '../db/queries';

export interface AuthContext {
  userId: string;
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

/**
 * Middleware to verify JWT token and attach user to context
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized: No token provided' }, 401);
  }

  const token = authHeader.substring(7);
  const jwtSecret = c.env.JWT_SECRET;

  if (!jwtSecret) {
    return c.json({ success: false, error: 'Server configuration error' }, 500);
  }

  const payload = await verifyToken(token, jwtSecret);

  if (!payload) {
    return c.json({ success: false, error: 'Unauthorized: Invalid token' }, 401);
  }

  // Fetch user from database
  const user = await findUserById(c.env.DB, payload.userId);

  if (!user) {
    return c.json({ success: false, error: 'Unauthorized: User not found' }, 401);
  }

  // Attach user info to context
  c.set('userId', user.id);
  c.set('user', {
    id: user.id,
    email: user.email,
    username: user.username,
  });

  await next();
}
