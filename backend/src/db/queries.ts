import { D1Database } from '@cloudflare/workers-types';
import { generateUUID } from '../utils/validation';

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
  export_token: string | null;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
}

/**
 * Create a new user
 */
export async function createUser(
  db: D1Database,
  email: string,
  username: string,
  passwordHash: string
): Promise<User> {
  const id = generateUUID();
  const now = Date.now();

  await db
    .prepare(
      'INSERT INTO users (id, email, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(id, email.toLowerCase(), username, passwordHash, now, now)
    .run();

  return {
    id,
    email: email.toLowerCase(),
    username,
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
    export_token: null,
  };
}

/**
 * Find user by email
 */
export async function findUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first<User>();

  return result;
}

/**
 * Find user by username
 */
export async function findUserByUsername(db: D1Database, username: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first<User>();

  return result;
}

/**
 * Find user by ID
 */
export async function findUserById(db: D1Database, userId: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  return result;
}

/**
 * Find user by export token
 */
export async function findUserByExportToken(db: D1Database, token: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE export_token = ?')
    .bind(token)
    .first<User>();

  return result;
}

/**
 * Generate a short 6-character alphanumeric token
 */
function generateShortToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // Removed ambiguous: 0,o,1,l,i
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Get or create export token for user
 */
export async function getOrCreateExportToken(db: D1Database, userId: string): Promise<string> {
  const user = await findUserById(db, userId);
  if (user?.export_token) {
    return user.export_token;
  }

  // Generate unique short token
  let token = generateShortToken();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await findUserByExportToken(db, token);
    if (!existing) break;
    token = generateShortToken();
    attempts++;
  }

  await db
    .prepare('UPDATE users SET export_token = ? WHERE id = ?')
    .bind(token, userId)
    .run();

  return token;
}

/**
 * Regenerate export token for user
 */
export async function regenerateExportToken(db: D1Database, userId: string): Promise<string> {
  let token = generateShortToken();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await findUserByExportToken(db, token);
    if (!existing) break;
    token = generateShortToken();
    attempts++;
  }

  await db
    .prepare('UPDATE users SET export_token = ? WHERE id = ?')
    .bind(token, userId)
    .run();

  return token;
}

/**
 * Create a session
 */
export async function createSession(
  db: D1Database,
  userId: string,
  token: string,
  expiresAt: number
): Promise<Session> {
  const id = generateUUID();
  const now = Date.now();

  await db
    .prepare('INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, userId, token, expiresAt, now)
    .run();

  return {
    id,
    user_id: userId,
    token,
    expires_at: expiresAt,
    created_at: now,
  };
}

/**
 * Find session by token
 */
export async function findSessionByToken(db: D1Database, token: string): Promise<Session | null> {
  const result = await db
    .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?')
    .bind(token, Date.now())
    .first<Session>();

  return result;
}

/**
 * Delete session by token
 */
export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

/**
 * Delete expired sessions
 */
export async function deleteExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now()).run();
}

/**
 * Delete all user sessions (logout from all devices)
 */
export async function deleteUserSessions(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

// ==================== Playlist Queries ====================

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  m3u_url: string;
  created_at: number;
  updated_at: number;
  last_accessed: number | null;
}

/**
 * Create a new playlist
 */
export async function createPlaylist(
  db: D1Database,
  userId: string,
  name: string,
  m3uUrl: string
): Promise<Playlist> {
  const id = generateUUID();
  const now = Date.now();

  await db
    .prepare(
      'INSERT INTO playlists (id, user_id, name, m3u_url, created_at, updated_at, last_accessed) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(id, userId, name, m3uUrl, now, now, null)
    .run();

  return {
    id,
    user_id: userId,
    name,
    m3u_url: m3uUrl,
    created_at: now,
    updated_at: now,
    last_accessed: null,
  };
}

/**
 * Get all playlists for a user
 */
export async function getUserPlaylists(db: D1Database, userId: string): Promise<Playlist[]> {
  const result = await db
    .prepare('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all<Playlist>();

  return result.results || [];
}

/**
 * Get a single playlist by ID
 */
export async function getPlaylistById(db: D1Database, playlistId: string): Promise<Playlist | null> {
  const result = await db
    .prepare('SELECT * FROM playlists WHERE id = ?')
    .bind(playlistId)
    .first<Playlist>();

  return result;
}

/**
 * Update a playlist
 */
export async function updatePlaylist(
  db: D1Database,
  playlistId: string,
  name: string,
  m3uUrl: string
): Promise<void> {
  const now = Date.now();

  await db
    .prepare('UPDATE playlists SET name = ?, m3u_url = ?, updated_at = ? WHERE id = ?')
    .bind(name, m3uUrl, now, playlistId)
    .run();
}

/**
 * Update playlist last accessed timestamp
 */
export async function updatePlaylistAccess(db: D1Database, playlistId: string): Promise<void> {
  const now = Date.now();

  await db
    .prepare('UPDATE playlists SET last_accessed = ? WHERE id = ?')
    .bind(now, playlistId)
    .run();
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(db: D1Database, playlistId: string): Promise<void> {
  await db.prepare('DELETE FROM playlists WHERE id = ?').bind(playlistId).run();
}

/**
 * Check if playlist belongs to user
 */
export async function isPlaylistOwner(
  db: D1Database,
  playlistId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare('SELECT id FROM playlists WHERE id = ? AND user_id = ?')
    .bind(playlistId, userId)
    .first();

  return !!result;
}

// ==================== Favorites Queries ====================

export interface Favorite {
  id: string;
  user_id: string;
  channel_name: string;
  channel_url: string;
  channel_logo: string | null;
  channel_group: string | null;
  source_playlist_id: string | null;
  category_id: string | null;
  created_at: number;
}

/**
 * Create a new favorite
 */
export async function createFavorite(
  db: D1Database,
  userId: string,
  channelName: string,
  channelUrl: string,
  channelLogo?: string,
  channelGroup?: string,
  sourcePlaylistId?: string,
  categoryId?: string
): Promise<Favorite> {
  const id = generateUUID();
  const now = Date.now();

  await db
    .prepare(
      'INSERT INTO favorites (id, user_id, channel_name, channel_url, channel_logo, channel_group, source_playlist_id, category_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      id,
      userId,
      channelName,
      channelUrl,
      channelLogo || null,
      channelGroup || null,
      sourcePlaylistId || null,
      categoryId || null,
      now
    )
    .run();

  return {
    id,
    user_id: userId,
    channel_name: channelName,
    channel_url: channelUrl,
    channel_logo: channelLogo || null,
    channel_group: channelGroup || null,
    source_playlist_id: sourcePlaylistId || null,
    category_id: categoryId || null,
    created_at: now,
  };
}

/**
 * Get all favorites for a user
 */
export async function getUserFavorites(db: D1Database, userId: string): Promise<Favorite[]> {
  const result = await db
    .prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all<Favorite>();

  return result.results || [];
}

/**
 * Get a single favorite by ID
 */
export async function getFavoriteById(db: D1Database, favoriteId: string): Promise<Favorite | null> {
  const result = await db
    .prepare('SELECT * FROM favorites WHERE id = ?')
    .bind(favoriteId)
    .first<Favorite>();

  return result;
}

/**
 * Delete a favorite
 */
export async function deleteFavorite(db: D1Database, favoriteId: string): Promise<void> {
  await db.prepare('DELETE FROM favorites WHERE id = ?').bind(favoriteId).run();
}

/**
 * Check if a channel is favorited by user
 */
export async function isFavorited(
  db: D1Database,
  userId: string,
  channelUrl: string
): Promise<boolean> {
  const result = await db
    .prepare('SELECT id FROM favorites WHERE user_id = ? AND channel_url = ?')
    .bind(userId, channelUrl)
    .first();

  return !!result;
}

/**
 * Get favorite by user and channel URL (for finding existing favorite)
 */
export async function getFavoriteByUserAndUrl(
  db: D1Database,
  userId: string,
  channelUrl: string
): Promise<Favorite | null> {
  const result = await db
    .prepare('SELECT * FROM favorites WHERE user_id = ? AND channel_url = ?')
    .bind(userId, channelUrl)
    .first<Favorite>();

  return result;
}

/**
 * Check if favorite belongs to user
 */
export async function isFavoriteOwner(
  db: D1Database,
  favoriteId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare('SELECT id FROM favorites WHERE id = ? AND user_id = ?')
    .bind(favoriteId, userId)
    .first();

  return !!result;
}

/**
 * Update favorite's category
 */
export async function updateFavoriteCategory(
  db: D1Database,
  favoriteId: string,
  categoryId: string | null
): Promise<void> {
  await db
    .prepare('UPDATE favorites SET category_id = ? WHERE id = ?')
    .bind(categoryId, favoriteId)
    .run();
}

/**
 * Get favorites by category
 */
export async function getFavoritesByCategory(
  db: D1Database,
  userId: string,
  categoryId: string | null
): Promise<Favorite[]> {
  let query: string;
  let bindings: (string | null)[];

  if (categoryId === null) {
    query = 'SELECT * FROM favorites WHERE user_id = ? AND category_id IS NULL ORDER BY created_at DESC';
    bindings = [userId];
  } else {
    query = 'SELECT * FROM favorites WHERE user_id = ? AND category_id = ? ORDER BY created_at DESC';
    bindings = [userId, categoryId];
  }

  const result = await db.prepare(query).bind(...bindings).all<Favorite>();

  return result.results || [];
}

// ==================== Category Queries ====================

export interface Category {
  id: string;
  user_id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface CategoryWithCount extends Category {
  channel_count: number;
}

/**
 * Create a new category
 */
export async function createCategory(
  db: D1Database,
  userId: string,
  name: string
): Promise<Category> {
  const id = generateUUID();
  const now = Date.now();

  await db
    .prepare(
      'INSERT INTO categories (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(id, userId, name.trim(), now, now)
    .run();

  return {
    id,
    user_id: userId,
    name: name.trim(),
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get all categories for a user with channel counts
 */
export async function getUserCategories(db: D1Database, userId: string): Promise<CategoryWithCount[]> {
  const result = await db
    .prepare(`
      SELECT
        c.id,
        c.user_id,
        c.name,
        c.created_at,
        c.updated_at,
        COUNT(f.id) as channel_count
      FROM categories c
      LEFT JOIN favorites f ON c.id = f.category_id
      WHERE c.user_id = ?
      GROUP BY c.id, c.user_id, c.name, c.created_at, c.updated_at
      ORDER BY c.name ASC
    `)
    .bind(userId)
    .all<CategoryWithCount>();

  return result.results || [];
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(db: D1Database, categoryId: string): Promise<Category | null> {
  const result = await db
    .prepare('SELECT * FROM categories WHERE id = ?')
    .bind(categoryId)
    .first<Category>();

  return result;
}

/**
 * Update a category name
 */
export async function updateCategory(
  db: D1Database,
  categoryId: string,
  name: string
): Promise<void> {
  const now = Date.now();

  await db
    .prepare('UPDATE categories SET name = ?, updated_at = ? WHERE id = ?')
    .bind(name.trim(), now, categoryId)
    .run();
}

/**
 * Delete a category (favorites will be set to uncategorized)
 */
export async function deleteCategory(db: D1Database, categoryId: string): Promise<void> {
  // First, set all favorites in this category to NULL (uncategorized)
  await db
    .prepare('UPDATE favorites SET category_id = NULL WHERE category_id = ?')
    .bind(categoryId)
    .run();

  // Then delete the category
  await db.prepare('DELETE FROM categories WHERE id = ?').bind(categoryId).run();
}

/**
 * Check if category belongs to user
 */
export async function isCategoryOwner(
  db: D1Database,
  categoryId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?')
    .bind(categoryId, userId)
    .first();

  return !!result;
}

/**
 * Check if category name exists for user
 */
export async function categoryNameExists(
  db: D1Database,
  userId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  let query = 'SELECT id FROM categories WHERE user_id = ? AND name = ?';
  const bindings: string[] = [userId, name.trim()];

  if (excludeId) {
    query += ' AND id != ?';
    bindings.push(excludeId);
  }

  const result = await db.prepare(query).bind(...bindings).first();

  return !!result;
}

// ==================== EPG Queries ====================

export interface EPGSource {
  id: string;
  playlist_id: string;
  epg_url: string;
  last_fetched: number | null;
  last_modified: string | null;
  etag: string | null;
  fetch_error: string | null;
  created_at: number;
  updated_at: number;
}

export interface EPGProgramDB {
  id: string;
  epg_source_id: string;
  channel_id: string;
  title: string;
  description: string | null;
  start_time: number;
  end_time: number;
  category: string | null;
  icon_url: string | null;
  created_at: number;
}

/**
 * Get or create EPG source for a playlist
 */
export async function getOrCreateEPGSource(
  db: D1Database,
  playlistId: string,
  epgUrl: string
): Promise<EPGSource> {
  // Check if source exists
  const existing = await db
    .prepare('SELECT * FROM epg_sources WHERE playlist_id = ?')
    .bind(playlistId)
    .first<EPGSource>();

  if (existing) {
    // Update URL if changed
    if (existing.epg_url !== epgUrl) {
      const now = Date.now();
      await db
        .prepare('UPDATE epg_sources SET epg_url = ?, updated_at = ?, last_fetched = NULL, fetch_error = NULL WHERE id = ?')
        .bind(epgUrl, now, existing.id)
        .run();
      return { ...existing, epg_url: epgUrl, updated_at: now, last_fetched: null, fetch_error: null };
    }
    return existing;
  }

  // Create new source
  const id = generateUUID();
  const now = Date.now();

  await db
    .prepare(
      'INSERT INTO epg_sources (id, playlist_id, epg_url, last_fetched, last_modified, etag, fetch_error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(id, playlistId, epgUrl, null, null, null, null, now, now)
    .run();

  return {
    id,
    playlist_id: playlistId,
    epg_url: epgUrl,
    last_fetched: null,
    last_modified: null,
    etag: null,
    fetch_error: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get EPG source for a playlist
 */
export async function getEPGSourceForPlaylist(
  db: D1Database,
  playlistId: string
): Promise<EPGSource | null> {
  return await db
    .prepare('SELECT * FROM epg_sources WHERE playlist_id = ?')
    .bind(playlistId)
    .first<EPGSource>();
}

/**
 * Update EPG source after fetch attempt
 */
export async function updateEPGSourceFetch(
  db: D1Database,
  sourceId: string,
  lastModified: string | null,
  etag: string | null,
  fetchError: string | null
): Promise<void> {
  const now = Date.now();

  await db
    .prepare(
      'UPDATE epg_sources SET last_fetched = ?, last_modified = ?, etag = ?, fetch_error = ?, updated_at = ? WHERE id = ?'
    )
    .bind(now, lastModified, etag, fetchError, now, sourceId)
    .run();
}

/**
 * Check if EPG data should be refreshed (older than 1 hour)
 */
export function shouldRefreshEPG(source: EPGSource): boolean {
  if (!source.last_fetched) return true;

  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  return source.last_fetched < oneHourAgo;
}

/**
 * Clear all programs for an EPG source
 */
export async function clearEPGPrograms(db: D1Database, sourceId: string): Promise<void> {
  await db.prepare('DELETE FROM epg_programs WHERE epg_source_id = ?').bind(sourceId).run();
}

/**
 * Insert EPG programs (batch insert)
 */
export async function insertEPGPrograms(
  db: D1Database,
  sourceId: string,
  programs: Array<{
    channel_id: string;
    title: string;
    description?: string;
    start_time: number;
    end_time: number;
    category?: string;
    icon_url?: string;
  }>
): Promise<void> {
  if (programs.length === 0) return;

  const now = Date.now();

  // D1 has limits on batch size, so we chunk into groups of 100
  const chunkSize = 100;
  for (let i = 0; i < programs.length; i += chunkSize) {
    const chunk = programs.slice(i, i + chunkSize);
    const statements = chunk.map((prog) => {
      const id = generateUUID();
      return db
        .prepare(
          'INSERT INTO epg_programs (id, epg_source_id, channel_id, title, description, start_time, end_time, category, icon_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          id,
          sourceId,
          prog.channel_id,
          prog.title,
          prog.description || null,
          prog.start_time,
          prog.end_time,
          prog.category || null,
          prog.icon_url || null,
          now
        );
    });

    await db.batch(statements);
  }
}

/**
 * Get Now/Next programs for a list of channel IDs
 */
export async function getNowNextPrograms(
  db: D1Database,
  sourceId: string,
  channelIds: string[],
  now: number = Date.now()
): Promise<Record<string, { now?: EPGProgramDB; next?: EPGProgramDB }>> {
  if (channelIds.length === 0) return {};

  const result: Record<string, { now?: EPGProgramDB; next?: EPGProgramDB }> = {};

  // Get all relevant programs (current and upcoming) for these channels
  // We need programs where: (start_time <= now AND end_time > now) OR (start_time > now)
  const placeholders = channelIds.map(() => '?').join(',');
  const query = `
    SELECT * FROM epg_programs
    WHERE epg_source_id = ?
      AND channel_id IN (${placeholders})
      AND end_time > ?
    ORDER BY channel_id, start_time
  `;

  const programs = await db
    .prepare(query)
    .bind(sourceId, ...channelIds, now)
    .all<EPGProgramDB>();

  // Group by channel and find now/next
  for (const prog of programs.results || []) {
    if (!result[prog.channel_id]) {
      result[prog.channel_id] = {};
    }

    const entry = result[prog.channel_id];

    // Check if this is the current program
    if (prog.start_time <= now && prog.end_time > now) {
      entry.now = prog;
    }
    // Check if this is the next program (first program starting after now)
    else if (prog.start_time > now && !entry.next) {
      entry.next = prog;
    }
  }

  return result;
}

/**
 * Get programs for a specific channel within a time range
 */
export async function getChannelPrograms(
  db: D1Database,
  sourceId: string,
  channelId: string,
  startTime: number,
  endTime: number
): Promise<EPGProgramDB[]> {
  const result = await db
    .prepare(
      `SELECT * FROM epg_programs
       WHERE epg_source_id = ?
         AND channel_id = ?
         AND start_time < ?
         AND end_time > ?
       ORDER BY start_time`
    )
    .bind(sourceId, channelId, endTime, startTime)
    .all<EPGProgramDB>();

  return result.results || [];
}

/**
 * Clean up old programs (older than 1 hour)
 */
export async function cleanupOldPrograms(db: D1Database, sourceId: string): Promise<void> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  await db
    .prepare('DELETE FROM epg_programs WHERE epg_source_id = ? AND end_time < ?')
    .bind(sourceId, oneHourAgo)
    .run();
}
