-- Migration: Convert phone numbers to email addresses
-- This migration updates the users table to use email instead of phone_number

BEGIN;

-- Add email column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create unique index for email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- For existing users, we need to update their records
-- Since we're switching from phone to email, existing users will need to update their accounts
-- We'll set a temporary email format that they'll need to change on first login

-- Update existing users with temporary email addresses based on their phone numbers
-- Format: user_{phone_number}@temp.anyhowfitness.com
UPDATE users 
SET email = CONCAT('user_', REPLACE(phone_number, '+', ''), '@temp.anyhowfitness.com')
WHERE email IS NULL AND phone_number IS NOT NULL;

-- For users without phone numbers, use their display name
UPDATE users 
SET email = CONCAT(LOWER(REPLACE(display_name, ' ', '_')), '@temp.anyhowfitness.com')
WHERE email IS NULL;

-- Make email column required
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Add email validation constraint
ALTER TABLE users ADD CONSTRAINT chk_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Keep phone_number column for now (we'll remove it later after confirming everything works)
-- ALTER TABLE users DROP COLUMN phone_number;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Add email verification columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;

-- Update existing users to be verified (since they were already using the app)
UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;

COMMIT;