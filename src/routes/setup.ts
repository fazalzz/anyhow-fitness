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
    await db.query(`DROP TABLE IF EXISTS exercise_sets CASCADE`);
    await db.query(`DROP TABLE IF EXISTS logged_exercises CASCADE`);
    await db.query(`DROP TABLE IF EXISTS custom_exercises CASCADE`);
    await db.query(`DROP TABLE IF EXISTS posts CASCADE`);
    await db.query(`DROP TABLE IF EXISTS body_weight_entries CASCADE`);
    await db.query(`DROP TABLE IF EXISTS friendships CASCADE`);
    await db.query(`DROP TABLE IF EXISTS workouts CASCADE`);
    await db.query(`DROP TABLE IF EXISTS user_two_factor_tokens CASCADE`);
    await db.query(`DROP TABLE IF EXISTS users CASCADE`);
    
    console.log('Creating users table...');
    await db.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        display_name VARCHAR(255) UNIQUE NOT NULL,
        pin_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        email VARCHAR(255),
        phone_number VARCHAR(20),
        is_private BOOLEAN DEFAULT FALSE,
        avatar TEXT
      )
    `);
    
    console.log('Creating user_two_factor_tokens table...');
    await db.query(`
      CREATE TABLE user_two_factor_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        code_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        consumed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating workouts table...');
    await db.query(`
      CREATE TABLE workouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TIMESTAMP NOT NULL,
        branch VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating logged_exercises table...');
    await db.query(`
      CREATE TABLE logged_exercises (
        id SERIAL PRIMARY KEY,
        workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id VARCHAR(255) NOT NULL,
        variation VARCHAR(50) NOT NULL CHECK (variation IN ('Bilateral', 'Unilateral')),
        brand VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating exercise_sets table...');
    await db.query(`
      CREATE TABLE exercise_sets (
        id SERIAL PRIMARY KEY,
        logged_exercise_id INTEGER NOT NULL REFERENCES logged_exercises(id) ON DELETE CASCADE,
        weight NUMERIC(6, 2) NOT NULL,
        reps INTEGER NOT NULL,
        pin_weight NUMERIC(6, 2) DEFAULT 0,
        is_pr BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating posts table...');
    await db.query(`
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
        image_url TEXT,
        caption TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating body_weight_entries table...');
    await db.query(`
      CREATE TABLE body_weight_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        weight NUMERIC(6, 2) NOT NULL,
        date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating friendships table...');
    await db.query(`
      CREATE TABLE friendships (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requester_id, receiver_id),
        CHECK (requester_id != receiver_id)
      )
    `);

    console.log('Creating gyms table...');
    await db.query(`
      CREATE TABLE gyms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        is_system_gym BOOLEAN NOT NULL DEFAULT FALSE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating gym_branches table...');
    await db.query(`
      CREATE TABLE gym_branches (
        id SERIAL PRIMARY KEY,
        gym_id INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        full_name VARCHAR(512) NOT NULL,
        address TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating user_gym_access table...');
    await db.query(`
      CREATE TABLE user_gym_access (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gym_branch_id INTEGER NOT NULL REFERENCES gym_branches(id) ON DELETE CASCADE,
        access_type VARCHAR(50) DEFAULT 'member',
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        UNIQUE(user_id, gym_branch_id)
      )
    `);

    console.log('Creating custom_exercises table...');
    await db.query(`
      CREATE TABLE custom_exercises (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        muscle_group VARCHAR(100) NOT NULL,
        primary_muscle VARCHAR(100),
        secondary_muscles TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `);

    console.log('Creating indexes for performance...');
    await db.query(`CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_posts_user_date ON posts(user_id, date DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships(requester_id, receiver_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_body_weight_user_date ON body_weight_entries(user_id, date DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_logged_exercises_workout ON logged_exercises(workout_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_exercise_sets_logged_exercise ON exercise_sets(logged_exercise_id)`);

    console.log('All tables created successfully');
    res.json({ 
      status: 'success', 
      message: 'Database initialized successfully with all required tables' 
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

// Database inspection endpoint
router.get('/inspect', async (req, res) => {
  try {
    // Get all tables
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = [];
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      
      // Get row count for each table
      const countResult = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const count = parseInt(countResult.rows[0].count);
      
      // Get column info
      const columnsResult = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName]);
      
      tables.push({
        name: tableName,
        rowCount: count,
        columns: columnsResult.rows
      });
    }
    
    res.json({ tables });
  } catch (error: any) {
    console.error('Database inspection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear all data endpoint
router.post('/clear-data', async (req, res) => {
  try {
    // Get all table names
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const cleared = [];
    
    // Clear data from each table (keeping structure)
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      
      // Get count before clearing
      const beforeResult = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const beforeCount = parseInt(beforeResult.rows[0].count);
      
      // Clear the table
      await db.query(`DELETE FROM ${tableName}`);
      
      // Reset auto-increment sequences if they exist
      try {
        await db.query(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), 1, false)`);
      } catch (seqError) {
        // Ignore if no sequence exists
      }
      
      cleared.push({
        table: tableName,
        rowsDeleted: beforeCount
      });
    }
    
    res.json({ 
      status: 'success',
      message: 'All table data cleared',
      cleared 
    });
  } catch (error: any) {
    console.error('Clear data error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;