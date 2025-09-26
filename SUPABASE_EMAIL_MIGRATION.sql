-- ⚡ SUPABASE EMAIL MIGRATION - COPY AND PASTE THIS ENTIRE SCRIPT
-- Run this in your Supabase SQL Editor to add email authentication

BEGIN;

-- 1. Add email column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Add email verification columns for future use
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;

-- 3. For existing users, create temporary emails based on phone numbers
-- Format: user_1234567890@temp.anyhowfitness.com
UPDATE public.users 
SET email = CONCAT('user_', REPLACE(REPLACE(phone_number, '+', ''), '-', ''), '@temp.anyhowfitness.com')
WHERE email IS NULL AND phone_number IS NOT NULL;

-- 4. For any users without phone numbers, use their display_name
UPDATE public.users 
SET email = CONCAT(LOWER(REPLACE(REPLACE(display_name, ' ', '_'), '''', '')), '@temp.anyhowfitness.com')
WHERE email IS NULL;

-- 5. Set existing users as email verified (they were already using the app)
UPDATE public.users SET email_verified = TRUE WHERE email_verified = FALSE;

-- 6. Make email required and unique
ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;

-- 7. Create unique constraint for email (drop and recreate to avoid conflicts)
DROP INDEX IF EXISTS idx_users_email_unique;
CREATE UNIQUE INDEX idx_users_email_unique ON public.users(email);

-- 8. Add email format validation constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_email_format;
ALTER TABLE public.users ADD CONSTRAINT chk_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 9. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_display_name ON public.users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON public.users(email_verified);

-- 10. Create custom_exercises table if it doesn't exist (for muscle group enhancements)
CREATE TABLE IF NOT EXISTS public.custom_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    muscle_group VARCHAR(100) NOT NULL,
    primary_muscle VARCHAR(100),
    secondary_muscles TEXT[], -- Array of secondary muscles
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 11. Add primary/secondary muscle columns to custom_exercises if they exist
DO $$ 
BEGIN
    -- Add primary_muscle column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'custom_exercises' 
        AND column_name = 'primary_muscle'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.custom_exercises ADD COLUMN primary_muscle VARCHAR(100);
    END IF;
    
    -- Add secondary_muscles column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'custom_exercises' 
        AND column_name = 'secondary_muscles'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.custom_exercises ADD COLUMN secondary_muscles TEXT[];
    END IF;
END $$;

-- 12. For existing custom exercises, set primary_muscle from muscle_group
UPDATE public.custom_exercises 
SET primary_muscle = muscle_group 
WHERE primary_muscle IS NULL AND muscle_group IS NOT NULL;

-- 13. Add index for muscle columns
CREATE INDEX IF NOT EXISTS idx_custom_exercises_primary_muscle ON public.custom_exercises(primary_muscle);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_id ON public.custom_exercises(user_id);

-- 14. Create migrations table to track this change
CREATE TABLE IF NOT EXISTS public.migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    hash VARCHAR(64),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Record this migration
INSERT INTO public.migrations (name, hash) 
VALUES (
    '004_email_migration', 
    'email_auth_forgot_password_implementation_v2'
) ON CONFLICT (name) DO UPDATE SET 
    hash = EXCLUDED.hash,
    executed_at = NOW();

COMMIT;

-- ✅ VERIFICATION QUERIES - Run these after the migration to verify success:
-- SELECT email, display_name, email_verified, phone_number FROM public.users LIMIT 5;
-- SELECT COUNT(*) as total_users, COUNT(email) as users_with_email FROM public.users;
-- SELECT name, primary_muscle, secondary_muscles FROM public.custom_exercises LIMIT 5;