import { Hono } from 'hono';
import { hashPassword, verifyPassword, validatePassword } from '../utils/password';
import { validateEmail, validateUsername } from '../utils/validation';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  createSession,
  findSessionByToken,
  deleteSession,
  deleteUserSessions,
} from '../db/queries';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono();

/**
 * POST /auth/register
 * Register a new user
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { email, username, password } = body;

    // Validate input
    if (!email || !username || !password) {
      return c.json({ success: false, error: 'Email, username, and password are required' }, 400);
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return c.json({ success: false, error: emailValidation.error }, 400);
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return c.json({ success: false, error: usernameValidation.error }, 400);
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return c.json({ success: false, error: passwordValidation.error }, 400);
    }

    // Check if user already exists
    const existingUserByEmail = await findUserByEmail(c.env.DB, email);
    if (existingUserByEmail) {
      return c.json({ success: false, error: 'Email already in use' }, 409);
    }

    const existingUserByUsername = await findUserByUsername(c.env.DB, username);
    if (existingUserByUsername) {
      return c.json({ success: false, error: 'Username already taken' }, 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await createUser(c.env.DB, email, username, passwordHash);

    // Generate tokens
    const accessToken = await generateToken(user.id, c.env.JWT_SECRET, c.env.JWT_EXPIRES_IN);
    const refreshToken = await generateRefreshToken(
      user.id,
      c.env.JWT_SECRET,
      c.env.REFRESH_TOKEN_EXPIRES_IN
    );

    // Create session
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    await createSession(c.env.DB, user.id, refreshToken, expiresAt);

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      accessToken,
      refreshToken,
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * POST /auth/login
 * Login a user
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password are required' }, 400);
    }

    // Find user by email
    const user = await findUserByEmail(c.env.DB, email);
    if (!user) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    // Generate tokens
    const accessToken = await generateToken(user.id, c.env.JWT_SECRET, c.env.JWT_EXPIRES_IN);
    const refreshToken = await generateRefreshToken(
      user.id,
      c.env.JWT_SECRET,
      c.env.REFRESH_TOKEN_EXPIRES_IN
    );

    // Create session
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    await createSession(c.env.DB, user.id, refreshToken, expiresAt);

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * GET /auth/me
 * Get current user info (requires authentication)
 */
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({
    success: true,
    user,
  });
});

/**
 * POST /auth/logout
 * Logout user (invalidate current session)
 */
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7); // Remove 'Bearer '

    if (token) {
      await deleteSession(c.env.DB, token);
    }

    return c.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * POST /auth/logout-all
 * Logout from all devices (invalidate all sessions)
 */
auth.post('/logout-all', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    await deleteUserSessions(c.env.DB, userId);

    return c.json({
      success: true,
      message: 'Logged out from all devices',
    });
  } catch (error) {
    console.error('Logout all error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
auth.post('/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return c.json({ success: false, error: 'Refresh token is required' }, 400);
    }

    // Verify refresh token
    const payload = await verifyToken(refreshToken, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ success: false, error: 'Invalid refresh token' }, 401);
    }

    // Check if session exists
    const session = await findSessionByToken(c.env.DB, refreshToken);
    if (!session) {
      return c.json({ success: false, error: 'Session not found or expired' }, 401);
    }

    // Get user
    const user = await findUserById(c.env.DB, payload.userId);
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 401);
    }

    // Generate new access token
    const accessToken = await generateToken(user.id, c.env.JWT_SECRET, c.env.JWT_EXPIRES_IN);

    return c.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default auth;
