-- Add category_id column to favorites table
ALTER TABLE favorites ADD COLUMN category_id TEXT;

-- Add foreign key constraint with ON DELETE SET NULL
-- When a category is deleted, favorites will have category_id set to NULL (uncategorized)
-- Note: SQLite doesn't support adding foreign keys after table creation in ALTER TABLE,
-- so we'll handle the relationship through application logic and create an index

-- Create index for performance
CREATE INDEX idx_favorites_category_id ON favorites(category_id);
