import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function resetMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });

  try {
    await pool.query('DROP TABLE IF EXISTS migrations;');
    console.log('Migrations table dropped successfully');
  } catch (error) {
    console.error('Error dropping migrations table:', error);
  } finally {
    await pool.end();
  }
}

resetMigrations();