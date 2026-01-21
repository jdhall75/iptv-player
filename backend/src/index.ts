import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import playlists from './routes/playlists';
import channels from './routes/channels';
import favorites from './routes/favorites';
import categories from './routes/categories';
import epg from './routes/epg';
import { exportRoutes,  serveM3U } from './routes/export';

// Define environment bindings
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_EXPIRES_IN: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/*', cors({
  origin: '*', // In production, replace with your frontend domain
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'IPTV Player API',
    version: '1.0.0',
  });
});

// Mount auth routes
app.route('/api/auth', auth);

// Mount playlist routes
app.route('/api/playlists', playlists);

// Mount channel routes
app.route('/api/channels', channels);

// Mount favorites routes
app.route('/api/favorites', favorites);

// Mount categories routes
app.route('/api/categories', categories);

// Mount EPG routes
app.route('/api/epg', epg);

// Mount export routes (authenticated endpoints)
app.route('/api/export', exportRoutes);

// // Short M3U URL for STB (e.g., /m3u/abc123.m3u)
app.get('/m3u/:token', serveM3U);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    success: false,
    error: 'Internal server error',
  }, 500);
});

export default app;
