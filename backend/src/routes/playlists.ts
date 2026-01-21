import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  isPlaylistOwner,
  updatePlaylistAccess,
} from '../db/queries';

const playlists = new Hono();

// All playlist routes require authentication
playlists.use('/*', authMiddleware);

/**
 * GET /playlists
 * Get all playlists for the current user
 */
playlists.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const userPlaylists = await getUserPlaylists(c.env.DB, userId);

    return c.json({
      success: true,
      playlists: userPlaylists,
    });
  } catch (error) {
    console.error('Get playlists error:', error);
    return c.json({ success: false, error: 'Failed to fetch playlists' }, 500);
  }
});

/**
 * GET /playlists/:id
 * Get a single playlist by ID
 */
playlists.get('/:id', async (c) => {
  try {
    const playlistId = c.req.param('id');
    const userId = c.get('userId');

    // Check ownership
    const isOwner = await isPlaylistOwner(c.env.DB, playlistId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Playlist not found or access denied' }, 404);
    }

    const playlist = await getPlaylistById(c.env.DB, playlistId);
    if (!playlist) {
      return c.json({ success: false, error: 'Playlist not found' }, 404);
    }

    // Update last accessed timestamp
    await updatePlaylistAccess(c.env.DB, playlistId);

    return c.json({
      success: true,
      playlist,
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    return c.json({ success: false, error: 'Failed to fetch playlist' }, 500);
  }
});

/**
 * POST /playlists
 * Create a new playlist
 */
playlists.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { name, m3u_url } = body;

    // Validate input
    if (!name || !m3u_url) {
      return c.json({ success: false, error: 'Name and M3U URL are required' }, 400);
    }

    // Validate name length
    if (name.trim().length < 1 || name.length > 100) {
      return c.json({ success: false, error: 'Name must be between 1 and 100 characters' }, 400);
    }

    // Validate M3U URL format
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(m3u_url)) {
      return c.json({ success: false, error: 'Invalid M3U URL format. Must start with http:// or https://' }, 400);
    }

    // Create playlist
    const playlist = await createPlaylist(c.env.DB, userId, name.trim(), m3u_url.trim());

    return c.json({
      success: true,
      playlist,
    }, 201);
  } catch (error) {
    console.error('Create playlist error:', error);
    return c.json({ success: false, error: 'Failed to create playlist' }, 500);
  }
});

/**
 * PUT /playlists/:id
 * Update a playlist
 */
playlists.put('/:id', async (c) => {
  try {
    const playlistId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();
    const { name, m3u_url } = body;

    // Validate input
    if (!name || !m3u_url) {
      return c.json({ success: false, error: 'Name and M3U URL are required' }, 400);
    }

    // Validate name length
    if (name.trim().length < 1 || name.length > 100) {
      return c.json({ success: false, error: 'Name must be between 1 and 100 characters' }, 400);
    }

    // Validate M3U URL format
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(m3u_url)) {
      return c.json({ success: false, error: 'Invalid M3U URL format. Must start with http:// or https://' }, 400);
    }

    // Check ownership
    const isOwner = await isPlaylistOwner(c.env.DB, playlistId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Playlist not found or access denied' }, 404);
    }

    // Update playlist
    await updatePlaylist(c.env.DB, playlistId, name.trim(), m3u_url.trim());

    // Fetch updated playlist
    const updatedPlaylist = await getPlaylistById(c.env.DB, playlistId);

    return c.json({
      success: true,
      playlist: updatedPlaylist,
    });
  } catch (error) {
    console.error('Update playlist error:', error);
    return c.json({ success: false, error: 'Failed to update playlist' }, 500);
  }
});

/**
 * DELETE /playlists/:id
 * Delete a playlist
 */
playlists.delete('/:id', async (c) => {
  try {
    const playlistId = c.req.param('id');
    const userId = c.get('userId');

    // Check ownership
    const isOwner = await isPlaylistOwner(c.env.DB, playlistId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Playlist not found or access denied' }, 404);
    }

    // Delete playlist
    await deletePlaylist(c.env.DB, playlistId);

    return c.json({
      success: true,
      message: 'Playlist deleted successfully',
    });
  } catch (error) {
    console.error('Delete playlist error:', error);
    return c.json({ success: false, error: 'Failed to delete playlist' }, 500);
  }
});

export default playlists;
