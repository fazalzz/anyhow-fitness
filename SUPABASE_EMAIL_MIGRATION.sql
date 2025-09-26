-- SUPABASE EMAIL MIGRATION - Run this in your Supabase SQL Editor
-- This updates your users table from phone numbers to email addresses

BEGIN;

-- 1. Add email column with validation
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Add email verification columns for future use
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;

-- 3. Add display_name column (maps to existing 'name' but clearer naming)
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- 4. For existing users, copy name to display_name
UPDATE users 
SET display_name = name 
WHERE display_name IS NULL;

-- 5. For existing users without email, create temporary emails
-- Format: user_{phone_number}@temp.anyhowfitness.com
UPDATE users 
SET email = CONCAT('user_', REPLACE(phone_number, '+', ''), '@temp.anyhowfitness.com')
WHERE email IS NULL AND phone_number IS NOT NULL;

-- 6. For users without phone numbers, use their name
UPDATE users 
SET email = CONCAT(LOWER(REPLACE(name, ' ', '_')), '@temp.anyhowfitness.com')
WHERE email IS NULL;

-- 7. Set existing users as email verified (they were already using the app)
UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;

-- 8. Make email required and unique
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);

-- 9. Add email format validation
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS chk_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 10. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- 11. Update custom_exercises table to support primary/secondary muscles
ALTER TABLE custom_exercises ADD COLUMN IF NOT EXISTS primary_muscle VARCHAR(100);
ALTER TABLE custom_exercises ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[]; -- Array of secondary muscles

-- 12. For existing custom exercises, set primary_muscle from muscle_group
UPDATE custom_exercises 
SET primary_muscle = muscle_group 
WHERE primary_muscle IS NULL;

-- 13. Make primary_muscle required
ALTER TABLE custom_exercises ALTER COLUMN primary_muscle SET NOT NULL;

-- 14. Add index for new muscle columns
CREATE INDEX IF NOT EXISTS idx_custom_exercises_primary_muscle ON custom_exercises(primary_muscle);

-- 15. Record this migration
INSERT INTO migrations (name, hash) 
VALUES (
    '004_email_migration', 
    'email_auth_forgot_password_implementation'
) ON CONFLICT (name) DO NOTHING;

COMMIT;

-- Verification queries (run these after the migration to check):
-- SELECT email, display_name, email_verified FROM users LIMIT 5;
-- SELECT COUNT(*) as total_users, COUNT(email) as users_with_email FROM users;
-- SELECT primary_muscle, secondary_muscles FROM custom_exercises LIMIT 5;