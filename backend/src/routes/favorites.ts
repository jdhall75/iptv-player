import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import {
  createFavorite,
  getUserFavorites,
  getFavoriteById,
  deleteFavorite,
  isFavoriteOwner,
  getFavoriteByUserAndUrl,
  updateFavoriteCategory,
} from '../db/queries';

const favorites = new Hono();

// All favorites routes require authentication
favorites.use('/*', authMiddleware);

/**
 * GET /favorites
 * Get all favorites for the current user
 */
favorites.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const userFavorites = await getUserFavorites(c.env.DB, userId);

    return c.json({
      success: true,
      favorites: userFavorites,
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    return c.json({ success: false, error: 'Failed to fetch favorites' }, 500);
  }
});

/**
 * GET /favorites/:id
 * Get a single favorite by ID
 */
favorites.get('/:id', async (c) => {
  try {
    const favoriteId = c.req.param('id');
    const userId = c.get('userId');

    // Check ownership
    const isOwner = await isFavoriteOwner(c.env.DB, favoriteId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Favorite not found or access denied' }, 404);
    }

    const favorite = await getFavoriteById(c.env.DB, favoriteId);
    if (!favorite) {
      return c.json({ success: false, error: 'Favorite not found' }, 404);
    }

    return c.json({
      success: true,
      favorite,
    });
  } catch (error) {
    console.error('Get favorite error:', error);
    return c.json({ success: false, error: 'Failed to fetch favorite' }, 500);
  }
});

/**
 * POST /favorites
 * Add a channel to favorites
 */
favorites.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { channel_name, channel_url, channel_logo, channel_group, source_playlist_id, category_id } = body;

    // Validate input
    if (!channel_name || !channel_url) {
      return c.json({ success: false, error: 'Channel name and URL are required' }, 400);
    }

    // Validate channel name length
    if (channel_name.trim().length < 1 || channel_name.length > 200) {
      return c.json(
        { success: false, error: 'Channel name must be between 1 and 200 characters' },
        400
      );
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(channel_url)) {
      return c.json(
        { success: false, error: 'Invalid channel URL format. Must start with http:// or https://' },
        400
      );
    }

    // Check if already favorited
    const existing = await getFavoriteByUserAndUrl(c.env.DB, userId, channel_url);
    if (existing) {
      return c.json(
        { success: false, error: 'Channel is already in favorites', favorite: existing },
        409
      );
    }

    // Create favorite
    const favorite = await createFavorite(
      c.env.DB,
      userId,
      channel_name.trim(),
      channel_url.trim(),
      channel_logo?.trim(),
      channel_group?.trim(),
      source_playlist_id?.trim(),
      category_id?.trim()
    );

    return c.json(
      {
        success: true,
        favorite,
      },
      201
    );
  } catch (error) {
    console.error('Create favorite error:', error);
    return c.json({ success: false, error: 'Failed to create favorite' }, 500);
  }
});

/**
 * PUT /favorites/:id/category
 * Update a favorite's category
 */
favorites.put('/:id/category', async (c) => {
  try {
    const favoriteId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();
    const { category_id } = body;

    // Check ownership
    const isOwner = await isFavoriteOwner(c.env.DB, favoriteId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Favorite not found or access denied' }, 404);
    }

    // Update category (category_id can be null to uncategorize)
    await updateFavoriteCategory(c.env.DB, favoriteId, category_id || null);

    // Fetch updated favorite
    const updatedFavorite = await getFavoriteById(c.env.DB, favoriteId);

    return c.json({
      success: true,
      favorite: updatedFavorite,
    });
  } catch (error) {
    console.error('Update favorite category error:', error);
    return c.json({ success: false, error: 'Failed to update favorite category' }, 500);
  }
});

/**
 * DELETE /favorites/:id
 * Remove a channel from favorites
 */
favorites.delete('/:id', async (c) => {
  try {
    const favoriteId = c.req.param('id');
    const userId = c.get('userId');

    // Check ownership
    const isOwner = await isFavoriteOwner(c.env.DB, favoriteId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Favorite not found or access denied' }, 404);
    }

    // Delete favorite
    await deleteFavorite(c.env.DB, favoriteId);

    return c.json({
      success: true,
      message: 'Favorite deleted successfully',
    });
  } catch (error) {
    console.error('Delete favorite error:', error);
    return c.json({ success: false, error: 'Failed to delete favorite' }, 500);
  }
});

/**
 * DELETE /favorites/by-url
 * Remove a channel from favorites by URL (alternative to ID-based deletion)
 */
favorites.post('/by-url/delete', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { channel_url } = body;

    if (!channel_url) {
      return c.json({ success: false, error: 'Channel URL is required' }, 400);
    }

    // Find the favorite
    const favorite = await getFavoriteByUserAndUrl(c.env.DB, userId, channel_url);
    if (!favorite) {
      return c.json({ success: false, error: 'Favorite not found' }, 404);
    }

    // Delete favorite
    await deleteFavorite(c.env.DB, favorite.id);

    return c.json({
      success: true,
      message: 'Favorite deleted successfully',
    });
  } catch (error) {
    console.error('Delete favorite by URL error:', error);
    return c.json({ success: false, error: 'Failed to delete favorite' }, 500);
  }
});

export default favorites;
