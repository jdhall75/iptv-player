import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import {
  findUserByExportToken,
  getOrCreateExportToken,
  regenerateExportToken,
  getUserFavorites,
} from '../db/queries';

const exportRoutes = new Hono();

/**
 * GET /export/m3u/:token
 * Public endpoint - serves M3U file of user's favorites
 * No authentication required (token acts as auth)
 */
const serveM3U = async (c) => {
// exportRoutes.get('/m3u/:token', async (c) => {
  try {
    let token = c.req.param('token');
    // Allow .m3u extension for compatibility
    if (token.endsWith('.m3u')) {
      token = token.slice(0, -4);
    }

    const user = await findUserByExportToken(c.env.DB, token);
    if (!user) {
      return c.text('#EXTM3U\n# Invalid or expired export token', 404, {
        'Content-Type': 'audio/x-mpegurl',
      });
    }

    // Get user's favorites
    const favorites = await getUserFavorites(c.env.DB, user.id);

    // Generate M3U content
    let m3u = '#EXTM3U\n';
    m3u += `# IPTV Player Favorites for ${user.username}\n`;
    m3u += `# Generated: ${new Date().toISOString()}\n`;
    m3u += `# Channels: ${favorites.length}\n\n`;

    for (const fav of favorites) {
      // Build EXTINF line with attributes
      let extinf = '#EXTINF:-1';

      if (fav.channel_logo) {
        extinf += ` tvg-logo="${fav.channel_logo}"`;
      }

      if (fav.channel_group) {
        extinf += ` group-title="${fav.channel_group}"`;
      }

      extinf += `,${fav.channel_name}`;

      m3u += extinf + '\n';
      m3u += fav.channel_url + '\n';
    }

    return c.text(m3u, 200, {
      'Content-Type': 'audio/x-mpegurl',
      'Content-Disposition': `inline; filename="favorites.m3u"`,
      'Cache-Control': 'no-cache',
    });
  } catch (error) {
    console.error('M3U export error:', error);
    return c.text('#EXTM3U\n# Error generating playlist', 500, {
      'Content-Type': 'audio/x-mpegurl',
    });
  }
};

// Protected routes below - require authentication
exportRoutes.use('/token/*', authMiddleware);

/**
 * GET /export/token
 * Get the current export URL (creates token if doesn't exist)
 */
exportRoutes.get('/token', async (c) => {
  try {
    const userId = c.get('userId');
    const token = await getOrCreateExportToken(c.env.DB, userId);

    // Build the short URL
    const url = new URL(c.req.url);
    const exportUrl = `${url.protocol}//${url.host}/m3u/${token}.m3u`;

    return c.json({
      success: true,
      export_url: exportUrl,
      token,
    });
  } catch (error) {
    console.error('Get export token error:', error);
    return c.json({ success: false, error: 'Failed to get export token' }, 500);
  }
});

/**
 * POST /export/token/regenerate
 * Generate a new export token (invalidates old URL)
 */
exportRoutes.post('/token/regenerate', async (c) => {
  try {
    const userId = c.get('userId');
    const token = await regenerateExportToken(c.env.DB, userId);

    const url = new URL(c.req.url);
    const exportUrl = `${url.protocol}//${url.host}/m3u/${token}.m3u`;

    return c.json({
      success: true,
      export_url: exportUrl,
      token,
      message: 'Export URL regenerated. Old URL is now invalid.',
    });
  } catch (error) {
    console.error('Regenerate export token error:', error);
    return c.json({ success: false, error: 'Failed to regenerate export token' }, 500);
  }
});

export { exportRoutes, serveM3U };
