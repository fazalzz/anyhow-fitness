const {query} = require("./database");

// Migration: Initial Schema
const runInitialSchemaMigration = async () => {
  try {
    console.log("Running initial schema migration...");

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
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
      )
    `);

    // Create friendship status enum and table
    await query(`
      DO $$ BEGIN
        CREATE TYPE friendship_status AS ENUM ('pending', 'accepted');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status friendship_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(requester_id, receiver_id)
      )
    `);

    // Create workouts table
    await query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        branch VARCHAR(255) NOT NULL
      )
    `);

    // Create exercise variation enum and logged_exercises table
    await query(`
      DO $$ BEGIN
        CREATE TYPE exercise_variation AS ENUM ('Bilateral', 'Unilateral');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS logged_exercises (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id VARCHAR(255) NOT NULL,
        variation exercise_variation NOT NULL,
        brand VARCHAR(255) NOT NULL
      )
    `);

    // Create exercise_sets table
    await query(`
      CREATE TABLE IF NOT EXISTS exercise_sets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        logged_exercise_id UUID NOT NULL REFERENCES logged_exercises(id) ON DELETE CASCADE,
        weight NUMERIC(6, 2) NOT NULL,
        reps INTEGER NOT NULL,
        pin_weight NUMERIC(6, 2),
        is_pr BOOLEAN NOT NULL DEFAULT false
      )
    `);

    // Create posts table
    await query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        caption TEXT,
        date TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create body_weight_entries table
    await query(`
      CREATE TABLE IF NOT EXISTS body_weight_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        weight NUMERIC(6, 2) NOT NULL,
        date TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create custom_exercises table
    await query(`
      CREATE TABLE IF NOT EXISTS custom_exercises (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        muscle_group VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, name)
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_id ON custom_exercises(user_id)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_custom_exercises_muscle_group ON custom_exercises(muscle_group)
    `);

    console.log("✅ Initial schema migration completed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
};

module.exports = {runInitialSchemaMigration};