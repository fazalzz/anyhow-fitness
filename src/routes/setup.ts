import express from 'express';
import { db } from '../config/database';

const router = express.Router();

// Setup basic tables for the application
router.post('/init', async (req, res) => {
  console.log('Database initialization started...');
  try {
    // Drop all tables in correct order (reverse of creation due to foreign keys)
    console.log('Dropping existing tables...');
    await db.query(`DROP TABLE IF EXISTS user_gym_access CASCADE`);
    await db.query(`DROP TABLE IF EXISTS gym_branches CASCADE`);
    await db.query(`DROP TABLE IF EXISTS gyms CASCADE`);
    await db.query(`DROP TABLE IF EXISTS workout_exercises CASCADE`);
    await db.query(`DROP TABLE IF EXISTS workouts CASCADE`);
    await db.query(`DROP TABLE IF EXISTS custom_exercises CASCADE`);
    await db.query(`DROP TABLE IF EXISTS posts CASCADE`);
    await db.query(`DROP TABLE IF EXISTS friendships CASCADE`);
    await db.query(`DROP TABLE IF EXISTS body_weight_entries CASCADE`);
    await db.query(`DROP TABLE IF EXISTS users CASCADE`);
    
    console.log('Creating users table...');
    // Create users table with all necessary columns
    await db.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        display_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL UNIQUE,
        pin_hash VARCHAR(255) NOT NULL,
        avatar TEXT,
        is_private BOOLEAN NOT NULL DEFAULT false,
        otp_code VARCHAR(10),
        otp_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create friendship status enum if it doesn't exist
    await db.query(`
      DO $$ BEGIN
        CREATE TYPE friendship_status AS ENUM ('pending', 'accepted');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create friendships table
    await db.query(`
      CREATE TABLE friendships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status friendship_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(requester_id, receiver_id)
      )
    `);

    // Create workouts table
    await db.query(`
      CREATE TABLE workouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        branch VARCHAR(255) NOT NULL
      )
    `);

    // Create posts table
    await db.query(`
      CREATE TABLE posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
        image_url TEXT,
        caption TEXT,
        date TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create body_weight_entries table
    await db.query(`
      CREATE TABLE body_weight_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        weight NUMERIC(6, 2) NOT NULL,
        date TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create gyms table
    await db.query(`
      CREATE TABLE gyms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        is_system_gym BOOLEAN NOT NULL DEFAULT FALSE,
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create gym_branches table
    await db.query(`
      CREATE TABLE gym_branches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        full_name VARCHAR(512) NOT NULL,
        address TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create user_gym_access table
    await db.query(`
      CREATE TABLE user_gym_access (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(user_id, gym_id)
      )
    `);

    // Create indexes for performance
    await db.query(`CREATE INDEX idx_users_display_name ON users(display_name)`);
    await db.query(`CREATE INDEX idx_users_phone ON users(phone_number)`);
    await db.query(`CREATE INDEX idx_gyms_name ON gyms(name)`);
    await db.query(`CREATE INDEX idx_gym_branches_gym_id ON gym_branches(gym_id)`);
    await db.query(`CREATE INDEX idx_user_gym_access_user_id ON user_gym_access(user_id)`);

    res.json({
      status: 'success',
      message: 'Database tables initialized successfully'
    });

  } catch (error: any) {
    console.error('Database setup error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to initialize database',
      error: error.message,
      code: error.code
    });
  }
});

export default router;