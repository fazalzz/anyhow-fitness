import { Pool, QueryResult, QueryResultRow } from 'pg';
import { ApiError } from '../types';
import { STATUS } from '../utils/errorHandler';

// Type for query parameters
type QueryParams = (string | number | boolean | Date)[];

/**
 * Generic database error handler that wraps pg-pool operations
 * and provides consistent error handling
 */
export class DatabaseError extends ApiError {
  constructor(message: string, status: number = STATUS.INTERNAL_SERVER) {
    super(message, status);
    this.name = 'DatabaseError';
  }
}

/**
 * Utility class for database operations
 */
export class Database {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Execute a query with error handling
   */
  async query<T extends QueryResultRow>(sql: string, params: QueryParams = []): Promise<QueryResult<T>> {
    try {
      return await this.pool.query(sql, params);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new DatabaseError('Resource already exists', STATUS.CONFLICT);
      }
      if (error.code === '23503') { // Foreign key violation
        throw new DatabaseError('Invalid reference', STATUS.BAD_REQUEST);
      }
      if (error.code === '42P01') { // Undefined table
        throw new DatabaseError('Table not found', STATUS.INTERNAL_SERVER);
      }
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Find a single record by ID
   */
  async findById<T extends QueryResultRow>(table: string, id: string, columns: string = '*'): Promise<T | null> {
    const result = await this.query<T>(
      `SELECT ${columns} FROM ${table} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find records by a specific field value
   */
  async findByField<T extends QueryResultRow>(
    table: string,
    field: string,
    value: string | number,
    columns: string = '*'
  ): Promise<T[]> {
    const result = await this.query<T>(
      `SELECT ${columns} FROM ${table} WHERE ${field} = $1`,
      [value]
    );
    return result.rows;
  }

  /**
   * Insert a new record
   */
  async insert<T extends QueryResultRow>(
    table: string,
    data: Record<string, any>,
    returning: string = '*'
  ): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const result = await this.query<T>(
      `INSERT INTO ${table} (${columns}) 
       VALUES (${placeholders}) 
       RETURNING ${returning}`,
      values
    );

    return result.rows[0];
  }

  /**
   * Update a record by ID
   */
  async updateById<T extends QueryResultRow>(
    table: string,
    id: string,
    data: Record<string, any>,
    returning: string = '*'
  ): Promise<T | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');

    const result = await this.query<T>(
      `UPDATE ${table} 
       SET ${setClause} 
       WHERE id = $${values.length + 1} 
       RETURNING ${returning}`,
      [...values, id]
    );

    return result.rows[0] || null;
  }

  /**
   * Delete a record by ID
   */
  async deleteById(table: string, id: string): Promise<boolean> {
    const result = await this.query(
      `DELETE FROM ${table} WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Begin a transaction
   */
  async transaction<T>(callback: (client: Database) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(new Database(new Pool({} as any)));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Create and export a singleton instance
import { pool } from '../config/database';
export const db = new Database(pool);