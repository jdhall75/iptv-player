-- Add export token to users for public M3U export
ALTER TABLE users ADD COLUMN export_token TEXT;

-- Create index for fast token lookup
CREATE INDEX idx_users_export_token ON users(export_token);
