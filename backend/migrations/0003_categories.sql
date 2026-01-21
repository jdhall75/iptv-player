-- Categories table for organizing favorites
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Unique index on user_id and name to prevent duplicate category names per user
CREATE UNIQUE INDEX idx_categories_user_name ON categories(user_id, name);

-- Index for performance
CREATE INDEX idx_categories_user_id ON categories(user_id);
