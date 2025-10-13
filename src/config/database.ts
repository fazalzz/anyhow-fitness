import { Pool } from 'pg';

// Use DATABASE_URL from environment variables
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log('🔗 Connecting to database...');

// Create a new PostgreSQL pool with Google Cloud SQL settings
export const db = new Pool({
  connectionString,
  ssl: false, // No SSL needed when using Cloud SQL Proxy (localhost connection)
  connectionTimeoutMillis: 20000, // 20 seconds
  idleTimeoutMillis: 60000, // 1 minute
  max: 5, // Smaller pool for Cloud Run
  min: 0, // Allow no idle connections
});

// Handle pool errors
db.on('error', (err) => {
  console.error('🚨 Database pool error:', err);
});

db.on('connect', () => {
  console.log('✅ Database connected successfully');
});

// Health check function for quick DB status
export async function healthCheck(): Promise<boolean> {
  let client;
  try {
    console.log('🏥 Running database health check...');
    client = await db.connect();
    const result = await client.query('SELECT 1 as test');
    console.log('✅ Database health check passed');
    return result.rows.length > 0 && result.rows[0].test === 1;
  } catch (err) {
    console.error('❌ Database health check failed:', err);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}
