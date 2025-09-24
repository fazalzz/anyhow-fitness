import { pool } from '../config/database';

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Testing database connection...');
    
    const result = await client.query('SELECT NOW() as now');
    console.log('Database connected successfully at:', result.rows[0].now);
    
    // Test each table
    const tables = [
      'users',
      'friendships',
      'workouts',
      'logged_exercises',
      'exercise_sets',
      'posts',
      'body_weight_entries'
    ];

    for (const table of tables) {
      const { rows } = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      console.log(`Table ${table}: ${rows[0].exists ? 'exists ✓' : 'missing ✗'}`);
    }

    client.release();
  } catch (err) {
    console.error('Database connection test failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();