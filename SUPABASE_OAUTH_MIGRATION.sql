-- OAuth Support Migration
-- This adds OAuth fields to the users table for Google authentication

-- Add OAuth-related columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email',
ADD COLUMN IF NOT EXISTS avatar VARCHAR(255);

-- Create index for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- Update existing users to have 'email' as auth_provider
UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL;

-- Make auth_provider not null
ALTER TABLE users ALTER COLUMN auth_provider SET NOT NULL;