import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getPlaylistById, isPlaylistOwner, updatePlaylistAccess, getNowNextPrograms } from '../db/queries';
import { parseM3U, filterChannels, Channel } from '../utils/m3u-parser';
import { refreshEPGIfNeeded } from './epg';

const channels = new Hono();

// All channel routes require authentication
channels.use('/*', authMiddleware);

/**
 * GET /channels/:playlistId
 * Parse M3U file and return channels for a playlist
 * Query params: ?search=term (optional)
 */
channels.get('/:playlistId', async (c) => {
  try {
    const playlistId = c.req.param('playlistId');
    const userId = c.get('userId');
    const searchTerm = c.req.query('search') || '';

    // Check ownership
    const isOwner = await isPlaylistOwner(c.env.DB, playlistId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Playlist not found or access denied' }, 404);
    }

    // Get playlist
    const playlist = await getPlaylistById(c.env.DB, playlistId);
    if (!playlist) {
      return c.json({ success: false, error: 'Playlist not found' }, 404);
    }

    // Update last accessed timestamp
    await updatePlaylistAccess(c.env.DB, playlistId);

    // Parse M3U file
    const parseResult = await parseM3U(playlist.m3u_url);

    if (parseResult.errors.length > 0 && parseResult.channels.length === 0) {
      return c.json(
        {
          success: false,
          error: 'Failed to parse M3U file',
          details: parseResult.errors,
        },
        400
      );
    }

    // Apply search filter if provided
    let channels = parseResult.channels;
    if (searchTerm) {
      channels = filterChannels(channels, searchTerm);
    }

    // Handle EPG data if available
    let epgAvailable = false;
    let epgData: Record<string, { now?: any; next?: any }> = {};

    if (parseResult.epg_url) {
      epgAvailable = true;

      // Refresh EPG data if needed (async, best-effort)
      const epgResult = await refreshEPGIfNeeded(c.env.DB, playlistId, parseResult.epg_url);

      if (epgResult.source) {
        // Get channel IDs that have tvg_id
        const channelIds = channels
          .filter((ch) => ch.tvg_id)
          .map((ch) => ch.tvg_id as string);

        if (channelIds.length > 0) {
          epgData = await getNowNextPrograms(c.env.DB, epgResult.source.id, channelIds);
        }
      }
    }

    // Merge EPG data into channels
    const channelsWithEPG = channels.map((ch) => ({
      ...ch,
      epg: ch.tvg_id && epgData[ch.tvg_id] ? epgData[ch.tvg_id] : undefined,
    }));

    return c.json({
      success: true,
      channels: channelsWithEPG,
      total: channelsWithEPG.length,
      epg_available: epgAvailable,
      epg_url: parseResult.epg_url,
      warnings: parseResult.errors.length > 0 ? parseResult.errors : undefined,
    });
  } catch (error) {
    console.error('Get channels error:', error);
    return c.json({ success: false, error: 'Failed to fetch channels' }, 500);
  }
});

export default channels;
