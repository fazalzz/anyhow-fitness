const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Use the same connection string from fly.toml
const DATABASE_URL = "postgresql://postgres:QSNFuKyM4g6lqLkx@db.gcurjrbuazviasegjcgi.supabase.co:5432/postgres?sslmode=require";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Create users table
    await pool.query(`
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
    console.log('✓ Users table created/verified');

    // Create other essential tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER,
        exercises JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Workouts table created/verified');

    await pool.query(`
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
    console.log('✓ Posts table created/verified');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Friendships table created/verified');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS body_weight_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        weight DECIMAL(5,2),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Body weight entries table created/verified');

    // Create a test user
    const testPin = '12345678';
    const pinHash = await bcrypt.hash(testPin, 10);
    
    await pool.query(`
      INSERT INTO users (name, username, display_name, phone_number, pin_hash)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (phone_number) DO NOTHING
    `, ['Test User', 'testuser_123', 'Test User', '+1234567890', pinHash]);
    
    console.log('✓ Test user created (name: "Test User", pin: "12345678")');

    // Verify user was created
    const userCheck = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`✓ Total users in database: ${userCheck.rows[0].count}`);

    console.log('\n🎉 Database setup complete!');
    console.log('You can now test login with:');
    console.log('  Name: "Test User"');
    console.log('  PIN: "12345678"');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();