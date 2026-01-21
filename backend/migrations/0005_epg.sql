-- EPG Sources table (tracks EPG URLs per playlist with cache metadata)
CREATE TABLE epg_sources (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL,
  epg_url TEXT NOT NULL,
  last_fetched INTEGER,
  last_modified TEXT,
  etag TEXT,
  fetch_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- EPG Programs table (stores parsed programme data)
CREATE TABLE epg_programs (
  id TEXT PRIMARY KEY,
  epg_source_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  category TEXT,
  icon_url TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (epg_source_id) REFERENCES epg_sources(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_epg_sources_playlist ON epg_sources(playlist_id);
CREATE INDEX idx_epg_programs_source ON epg_programs(epg_source_id);
CREATE INDEX idx_epg_programs_channel ON epg_programs(channel_id);
CREATE INDEX idx_epg_programs_time ON epg_programs(start_time, end_time);
CREATE INDEX idx_epg_programs_channel_time ON epg_programs(channel_id, start_time, end_time);
