import express from 'express';
import { db } from '../config/database';

const router = express.Router();

// Migration to drop phone_number column from users table
router.post('/drop-phone-number', async (req, res) => {
  try {
    console.log('Starting migration: dropping phone_number column from users table...');
    
    // Check if phone_number column exists
    const columnCheckResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone_number'
    `);
    
    if (columnCheckResult.rows.length > 0) {
      console.log('phone_number column found, dropping it...');
      await db.query('ALTER TABLE users DROP COLUMN phone_number');
      console.log('phone_number column dropped successfully');
      
      res.json({
        status: 'success',
        message: 'phone_number column dropped from users table',
        migrationApplied: true
      });
    } else {
      console.log('phone_number column not found in users table');
      res.json({
        status: 'success',
        message: 'phone_number column does not exist in users table',
        migrationApplied: false
      });
    }
  } catch (error: any) {
    console.error('Migration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to drop phone_number column',
      error: error.message
    });
  }
});

// General migration runner for schema updates
router.post('/schema-sync', async (req, res) => {
  try {
    console.log('Starting schema synchronization...');
    
    // Check current schema and apply necessary changes
    const migrations = [];
    
    // Check if phone_number column exists and drop it
    const phoneColumnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone_number'
    `);
    
    if (phoneColumnCheck.rows.length > 0) {
      console.log('Dropping phone_number column...');
      await db.query('ALTER TABLE users DROP COLUMN phone_number');
      migrations.push('Dropped phone_number column from users table');
    }
    
    // Add other schema checks here as needed
    
    console.log('Schema synchronization completed');
    res.json({
      status: 'success',
      message: 'Schema synchronized successfully',
      migrationsApplied: migrations
    });
  } catch (error: any) {
    console.error('Schema sync error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to synchronize schema',
      error: error.message
    });
  }
});

export default router;