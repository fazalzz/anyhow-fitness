const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function dropPhoneNumberColumn() {
  try {
    console.log('Checking if phone_number column exists...');
    
    // Check if phone_number column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone_number'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('phone_number column found, dropping it...');
      await pool.query('ALTER TABLE users DROP COLUMN phone_number');
      console.log('✅ phone_number column dropped successfully');
    } else {
      console.log('ℹ️  phone_number column does not exist');
    }
    
    // Verify the change
    const finalCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Final users table columns:');
    finalCheck.rows.forEach(row => console.log(`  - ${row.column_name}`));
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await pool.end();
  }
}

dropPhoneNumberColumn();