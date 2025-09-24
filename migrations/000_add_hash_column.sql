-- Add hash column to migrations table
ALTER TABLE IF EXISTS migrations ADD COLUMN IF NOT EXISTS hash VARCHAR(64);

-- Set initial hash values for existing migrations
UPDATE migrations 
SET hash = '0000000000000000000000000000000000000000000000000000000000000000' 
WHERE hash IS NULL;