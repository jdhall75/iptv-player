-- Favorites table for user-curated channel lists
CREATE TABLE favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_logo TEXT,
  channel_group TEXT,
  source_playlist_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_source_playlist_id ON favorites(source_playlist_id);

-- Unique constraint to prevent duplicate favorites
CREATE UNIQUE INDEX idx_favorites_user_channel ON favorites(user_id, channel_url);
