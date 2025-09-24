import { Pool, PoolClient } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// Interface for migration records
interface Migration {
  id: number;
  name: string;
  hash: string;
  executed_at: Date;
}

// Calculate hash of a migration file
async function calculateFileHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Ensure migrations table exists
async function ensureMigrationTable(): Promise<void> {
  // First create the basic table structure
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  
  // Then add the hash column if it doesn't exist
  await pool.query(`
    DO $$ 
    BEGIN 
      BEGIN
        ALTER TABLE migrations ADD COLUMN hash VARCHAR(64);
      EXCEPTION
        WHEN duplicate_column THEN 
          NULL;
      END;
    END $$;
  `);
}

// Get list of already executed migrations
async function getExecutedMigrations(): Promise<Map<string, Migration>> {
  try {
    const { rows } = await pool.query<Migration>(
      'SELECT id, name, hash, executed_at FROM migrations ORDER BY id'
    );
    return new Map(rows.map(row => [row.name, row]));
  } catch (error: any) {
    if (error.code === '42703') { // column "hash" does not exist
      // If hash column doesn't exist, return empty map to allow running all migrations
      return new Map();
    }
    throw error;
  }
}

// Get list of migration files
async function getMigrationFiles(): Promise<string[]> {
  const migrationsDir = path.join(__dirname);
  const files = await fs.readdir(migrationsDir);
  return files
    .filter(file => file.endsWith('.sql'))
    .sort();
}

// Execute a single migration
async function executeMigration(client: PoolClient, file: string): Promise<void> {
  const migrationPath = path.join(__dirname, file);
  const migration = await fs.readFile(migrationPath, 'utf8');
  const hash = await calculateFileHash(migrationPath);

  await client.query('BEGIN');
  try {
    await client.query(migration);
    await client.query(
      'INSERT INTO migrations (name, hash) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET hash = $2',
      [file, hash]
    );
    await client.query('COMMIT');
    console.log(`Migration ${file} completed successfully`);
  } catch (error: any) {
    await client.query('ROLLBACK');
    // If table already exists, just record the migration and continue
    if (error.code === '42P07') {
      await client.query('BEGIN');
      try {
        await client.query(
          'INSERT INTO migrations (name, hash) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET hash = $2',
          [file, hash]
        );
        await client.query('COMMIT');
        console.log(`Migration ${file} already applied, recording in migrations table`);
        return;
      } catch (innerError) {
        await client.query('ROLLBACK');
        throw innerError;
      }
    }
    throw error;
  }
}

// Main migration function
async function runMigrations(): Promise<void> {
  let client: PoolClient | null = null;
  try {
    console.log('Starting database migrations...');
    await ensureMigrationTable();
    
    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = await getMigrationFiles();
    client = await pool.connect();

    for (const file of migrationFiles) {
      const existingMigration = executedMigrations.get(file);
      if (existingMigration) {
        const currentHash = await calculateFileHash(path.join(__dirname, file));
        if (existingMigration.hash !== currentHash) {
          throw new Error(
            `Migration ${file} has been modified after being applied. ` +
            `This could indicate tampering or corruption.`
          );
        }
        console.log(`Migration ${file} already executed, skipping...`);
        continue;
      }

      console.log(`Running migration ${file}...`);
      await executeMigration(client, file);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
      await pool.end();
    }
  }
}

// Run migrations when script is executed directly
if (require.main === module) {
  runMigrations();
}