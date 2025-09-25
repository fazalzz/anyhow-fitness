import { Pool, PoolConfig, QueryResult } from 'pg';
import { logger } from '../utils/logger';

// Configure SSL for production Supabase connection
const getSslConfig = () => {
  // Always require SSL for Supabase connections, whether local or production
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.co')) {
    return {
      rejectUnauthorized: false
    };
  }
  return false; // No SSL for other databases
};

// Simple pool configuration removed - using Database class singleton below

interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

class Database {
  private static instance: Database;
  private pool: Pool;
  
  private constructor(config: DatabaseConfig) {
    const poolConfig: PoolConfig = {
      connectionString: config.connectionString,
      ssl: config.ssl || getSslConfig(),
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10), // Reduced for fly.io
      min: parseInt(process.env.DB_MIN_CONNECTIONS || '2', 10), // Keep minimum connections
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10), // Reduced timeout
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '3000', 10), // Faster timeout
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '10000', 10) // Query timeout instead of statement_timeout
    };

    if (!config.connectionString) {
      poolConfig.host = config.host;
      poolConfig.port = config.port;
      poolConfig.database = config.database;
      poolConfig.user = config.user;
      poolConfig.password = config.password;
    }

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle database client', err);
    });

    // Handle process termination
    process.on('SIGTERM', () => this.closePool());
    process.on('SIGINT', () => this.closePool());
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      const config: DatabaseConfig = {};
      
      if (process.env.DATABASE_URL) {
        // Use the connection string as-is for Supabase
        config.connectionString = process.env.DATABASE_URL;
        config.ssl = getSslConfig();
      } else {
        config.host = process.env.DB_HOST;
        config.port = parseInt(process.env.DB_PORT || '5432', 10);
        config.database = process.env.DB_NAME;
        config.user = process.env.DB_USER;
        config.password = process.env.DB_PASSWORD;
      }

      if (!config.connectionString && (!config.host || !config.database || !config.user)) {
        throw new Error('Database configuration is incomplete. Check environment variables.');
      }

      Database.instance = new Database(config);
    }
    return Database.instance;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  public async getClient() {
    return await this.pool.connect();
  }

  private async closePool() {
    try {
      await this.pool.end();
      logger.info('Database pool has been closed');
    } catch (error) {
      logger.error('Error closing database pool', error);
      process.exit(1);
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }
}

export const db = Database.getInstance();
