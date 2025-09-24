-- Anyhow Fitness Database Schema
-- Run this entire script in Supabase SQL Editor

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    pin_hash VARCHAR(255) NOT NULL,
    avatar TEXT,
    is_private BOOLEAN NOT NULL DEFAULT false,
    otp_code VARCHAR(10),
    otp_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create friendships table
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted');

CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status friendship_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(requester_id, receiver_id)
);

-- Create gyms table for user-defined gyms
CREATE TABLE gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_system_gym BOOLEAN DEFAULT FALSE
);

-- Create gym_branches table for specific locations of each gym
CREATE TABLE gym_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    address TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_system_branch BOOLEAN DEFAULT FALSE
);

-- Create user_gym_access table for permissions
CREATE TABLE user_gym_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, gym_id)
);

-- Create workouts table
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    branch VARCHAR(255) NOT NULL,
    gym_branch_id UUID REFERENCES gym_branches(id)
);

-- Create logged_exercises table
CREATE TYPE exercise_variation AS ENUM ('Bilateral', 'Unilateral');

CREATE TABLE logged_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id VARCHAR(255) NOT NULL,
    variation exercise_variation NOT NULL,
    brand VARCHAR(255) NOT NULL
);

-- Create exercise_sets table
CREATE TABLE exercise_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logged_exercise_id UUID NOT NULL REFERENCES logged_exercises(id) ON DELETE CASCADE,
    weight NUMERIC(6, 2) NOT NULL,
    reps INTEGER NOT NULL,
    pin_weight NUMERIC(6, 2),
    is_pr BOOLEAN NOT NULL DEFAULT false
);

-- Create posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create body_weight_entries table
CREATE TABLE body_weight_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight NUMERIC(6, 2) NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create custom_exercises table
CREATE TABLE custom_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    muscle_group VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Create migrations table for tracking
CREATE TABLE migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    hash VARCHAR(64),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert ArkGrit as the system gym
INSERT INTO gyms (name, is_system_gym) VALUES ('ArkGrit', TRUE);

-- Insert ArkGrit branches
DO $$
DECLARE
    arkgrit_id UUID;
BEGIN
    SELECT id INTO arkgrit_id FROM gyms WHERE name = 'ArkGrit' AND is_system_gym = TRUE;
    
    INSERT INTO gym_branches (gym_id, name, full_name, is_system_branch) VALUES
        (arkgrit_id, 'Buangkok', 'ArkGrit - Buangkok', TRUE),
        (arkgrit_id, 'Hougang', 'ArkGrit - Hougang', TRUE),
        (arkgrit_id, 'Bishan', 'ArkGrit - Bishan', TRUE),
        (arkgrit_id, 'Serangoon North', 'ArkGrit - Serangoon North', TRUE),
        (arkgrit_id, 'Downtown East', 'ArkGrit - Downtown East', TRUE),
        (arkgrit_id, 'Jurong West', 'ArkGrit - Jurong West', TRUE),
        (arkgrit_id, 'Tampines', 'ArkGrit - Tampines', TRUE),
        (arkgrit_id, 'Yishun', 'ArkGrit - Yishun', TRUE);
END $$;

-- Create indexes for performance
CREATE INDEX idx_gym_branches_gym_id ON gym_branches(gym_id);
CREATE INDEX idx_user_gym_access_user_id ON user_gym_access(user_id);
CREATE INDEX idx_user_gym_access_gym_id ON user_gym_access(gym_id);
CREATE INDEX idx_workouts_gym_branch_id ON workouts(gym_branch_id);
CREATE INDEX idx_custom_exercises_user_id ON custom_exercises(user_id);
CREATE INDEX idx_custom_exercises_muscle_group ON custom_exercises(muscle_group);