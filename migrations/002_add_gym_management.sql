-- Migration: Add gym management system
-- Description: Add tables for user-created gyms and gym branches

-- Create gyms table for user-defined gyms
CREATE TABLE gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_system_gym BOOLEAN DEFAULT FALSE -- True for ArkGrit locations, false for user-added
);

-- Create gym_branches table for specific locations of each gym
CREATE TABLE gym_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Buangkok", "Hougang"
    full_name VARCHAR(255) NOT NULL, -- e.g., "ArkGrit - Buangkok"
    address TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_system_branch BOOLEAN DEFAULT FALSE
);

-- Create user_gym_access table for permissions (who can see which gyms)
CREATE TABLE user_gym_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, gym_id)
);

-- Insert ArkGrit as the system gym
INSERT INTO gyms (name, is_system_gym) VALUES ('ArkGrit', TRUE);

-- Get the ArkGrit gym ID for inserting branches
DO $$
DECLARE
    arkgrit_id UUID;
BEGIN
    SELECT id INTO arkgrit_id FROM gyms WHERE name = 'ArkGrit' AND is_system_gym = TRUE;
    
    -- Insert ArkGrit branches
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

-- Add gym_branch_id to workouts table (but keep branch for backward compatibility)
ALTER TABLE workouts ADD COLUMN gym_branch_id UUID REFERENCES gym_branches(id);

-- Create indexes for performance
CREATE INDEX idx_gym_branches_gym_id ON gym_branches(gym_id);
CREATE INDEX idx_user_gym_access_user_id ON user_gym_access(user_id);
CREATE INDEX idx_user_gym_access_gym_id ON user_gym_access(gym_id);
CREATE INDEX idx_workouts_gym_branch_id ON workouts(gym_branch_id);