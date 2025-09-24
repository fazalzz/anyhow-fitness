const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testSupabaseConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');
    const res = await pool.query('SELECT version()');
    console.log('✅ Supabase connection successful!');
    console.log('Database version:', res.rows[0].version);
    
    // Test if our tables exist
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tables in database:');
    tablesRes.rows.forEach(row => console.log('  -', row.table_name));
    
    await pool.end();
    console.log('🎉 All tests passed! Your Supabase database is ready.');
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    process.exit(1);
  }
}

testSupabaseConnection();