-- Add display_name and username columns to separate internal identifier from display name
ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN display_name VARCHAR(255);

-- Migrate existing data: use current name as both username and display_name
UPDATE users SET 
    username = LOWER(REPLACE(name, ' ', '_')) || '_' || substring(id::text from 1 for 8),
    display_name = name;

-- Make username NOT NULL after migration
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;

-- Remove the unique constraint on name since it's now display_name
ALTER TABLE users DROP CONSTRAINT users_name_key;

-- Create index on username for fast lookups
CREATE INDEX idx_users_username ON users(username);