import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { hashPin } from '../utils/bcrypt';

const router = Router();

// One-time database setup endpoint (should be removed after use)
router.post('/init-db', async (_req: Request, res: Response) => {
  try {
    console.log('Starting database initialization...');
    
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        username VARCHAR(255) UNIQUE,
        display_name VARCHAR(255),
        phone_number VARCHAR(20) UNIQUE,
        pin_hash VARCHAR(255),
        avatar TEXT,
        is_private BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create other essential tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER,
        exercises JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        workout_id INTEGER REFERENCES workouts(id),
        image_url TEXT,
        caption TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS body_weight_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        weight DECIMAL(5,2),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create a test user
    const testPin = '12345678';
    const pinHash = await hashPin(testPin);
    
    await db.query(`
      INSERT INTO users (name, username, display_name, phone_number, pin_hash)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (phone_number) DO NOTHING
    `, ['Test User', 'testuser_123', 'Test User', '+1234567890', pinHash]);

    // Get user count
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');

    res.json({
      success: true,
      message: 'Database initialized successfully',
      userCount: userCount.rows[0].count,
      testUser: {
        name: 'Test User',
        pin: '12345678'
      }
    });

  } catch (error: any) {
    console.error('Database initialization failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;