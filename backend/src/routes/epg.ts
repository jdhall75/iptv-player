import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import {
  isPlaylistOwner,
  getEPGSourceForPlaylist,
  getOrCreateEPGSource,
  updateEPGSourceFetch,
  clearEPGPrograms,
  insertEPGPrograms,
  getNowNextPrograms,
  getChannelPrograms,
  shouldRefreshEPG,
  cleanupOldPrograms,
} from '../db/queries';
import { fetchAndParseXMLTV } from '../utils/xmltv-parser';

const epg = new Hono();

// All EPG routes require authentication
epg.use('/*', authMiddleware);

/**
 * GET /epg/:playlistId/now-next
 * Get Now/Next programs for all channels in a playlist
 * Query params: ?channel_ids=id1,id2,id3 (optional filter)
 */
epg.get('/:playlistId/now-next', async (c) => {
  try {
    const playlistId = c.req.param('playlistId');
    const userId = c.get('userId');
    const channelIdsParam = c.req.query('channel_ids');

    // Check ownership
    const isOwner = await isPlaylistOwner(c.env.DB, playlistId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Playlist not found or access denied' }, 404);
    }

    // Get EPG source
    const source = await getEPGSourceForPlaylist(c.env.DB, playlistId);
    if (!source) {
      return c.json({
        success: true,
        programs: {},
        message: 'No EPG data available for this playlist',
      });
    }

    // Parse channel IDs if provided
    let channelIds: string[] = [];
    if (channelIdsParam) {
      channelIds = channelIdsParam.split(',').map((id) => id.trim()).filter(Boolean);
    }

    // If no specific channels requested, we can't return everything (too expensive)
    if (channelIds.length === 0) {
      return c.json({
        success: false,
        error: 'channel_ids parameter is required',
      }, 400);
    }

    // Get Now/Next programs
    const programs = await getNowNextPrograms(c.env.DB, source.id, channelIds);

    return c.json({
      success: true,
      programs,
      last_updated: source.last_fetched,
    });
  } catch (error) {
    console.error('Get EPG now-next error:', error);
    return c.json({ success: false, error: 'Failed to fetch EPG data' }, 500);
  }
});

/**
 * POST /epg/:playlistId/refresh
 * Force refresh EPG data for a playlist
 * Body: { epg_url: string } (required - the EPG URL to fetch)
 */
epg.post('/:playlistId/refresh', async (c) => {
  try {
    const playlistId = c.req.param('playlistId');
    const userId = c.get('userId');
    const body = await c.req.json<{ epg_url?: string }>();

    // Check ownership
    const isOwner = await isPlaylistOwner(c.env.DB, playlistId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Playlist not found or access denied' }, 404);
    }

    if (!body.epg_url) {
      return c.json({ success: false, error: 'epg_url is required' }, 400);
    }

    // Get or create EPG source
    const source = await getOrCreateEPGSource(c.env.DB, playlistId, body.epg_url);

    // Fetch and parse XMLTV
    const result = await fetchAndParseXMLTV(body.epg_url);

    if (result.programs.length === 0 && result.errors.length > 0) {
      await updateEPGSourceFetch(c.env.DB, source.id, null, null, result.errors.join('; '));
      return c.json({
        success: false,
        error: 'Failed to parse EPG',
        details: result.errors,
      }, 400);
    }

    // Clear old programs and insert new ones
    await clearEPGPrograms(c.env.DB, source.id);
    await insertEPGPrograms(c.env.DB, source.id, result.programs);

    // Update source metadata
    await updateEPGSourceFetch(c.env.DB, source.id, null, null, null);

    return c.json({
      success: true,
      message: 'EPG refreshed successfully',
      program_count: result.programs.length,
      warnings: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('EPG refresh error:', error);
    return c.json({ success: false, error: 'Failed to refresh EPG' }, 500);
  }
});

/**
 * GET /epg/:playlistId/programs/:channelId
 * Get full program schedule for a specific channel
 * Query params: ?start=timestamp&end=timestamp
 */
epg.get('/:playlistId/programs/:channelId', async (c) => {
  try {
    const playlistId = c.req.param('playlistId');
    const channelId = c.req.param('channelId');
    const userId = c.get('userId');

    // Check ownership
    const isOwner = await isPlaylistOwner(c.env.DB, playlistId, userId);
    if (!isOwner) {
      return c.json({ success: false, error: 'Playlist not found or access denied' }, 404);
    }

    // Get EPG source
    const source = await getEPGSourceForPlaylist(c.env.DB, playlistId);
    if (!source) {
      return c.json({
        success: true,
        programs: [],
        message: 'No EPG data available for this playlist',
      });
    }

    // Parse time range (default: now to 24 hours from now)
    const now = Date.now();
    const startTime = parseInt(c.req.query('start') || String(now), 10);
    const endTime = parseInt(c.req.query('end') || String(now + 24 * 60 * 60 * 1000), 10);

    // Get programs
    const programs = await getChannelPrograms(c.env.DB, source.id, channelId, startTime, endTime);

    return c.json({
      success: true,
      programs,
      channel_id: channelId,
    });
  } catch (error) {
    console.error('Get channel programs error:', error);
    return c.json({ success: false, error: 'Failed to fetch channel programs' }, 500);
  }
});

/**
 * Helper function to refresh EPG data if stale
 * Used internally by channels route
 */
export async function refreshEPGIfNeeded(
  db: D1Database,
  playlistId: string,
  epgUrl: string
): Promise<{ source: EPGSource | null; refreshed: boolean; error?: string }> {
  try {
    const source = await getOrCreateEPGSource(db, playlistId, epgUrl);

    if (!shouldRefreshEPG(source)) {
      return { source, refreshed: false };
    }

    // Fetch and parse XMLTV
    const result = await fetchAndParseXMLTV(epgUrl);

    if (result.programs.length === 0 && result.errors.length > 0) {
      await updateEPGSourceFetch(db, source.id, null, null, result.errors.join('; '));
      return { source, refreshed: false, error: result.errors.join('; ') };
    }

    // Clean up old programs and insert new ones
    await cleanupOldPrograms(db, source.id);
    await clearEPGPrograms(db, source.id);
    await insertEPGPrograms(db, source.id, result.programs);

    // Update source metadata
    await updateEPGSourceFetch(db, source.id, null, null, null);

    return { source: { ...source, last_fetched: Date.now() }, refreshed: true };
  } catch (error) {
    console.error('EPG refresh error:', error);
    return { source: null, refreshed: false, error: String(error) };
  }
}

// Need to import the type
import type { D1Database } from '@cloudflare/workers-types';
import type { EPGSource } from '../db/queries';

export default epg;
