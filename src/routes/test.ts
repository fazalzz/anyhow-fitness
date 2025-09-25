import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Test database connection
router.get('/db', async (_req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ 
      status: 'OK',
      timestamp: result.rows[0].now,
      message: 'Database connection successful'
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'ERROR',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Test users table structure and data
router.get('/users', async (_req: Request, res: Response) => {
  try {
    // Check if users table exists and get column info
    const tableInfo = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    // Get count of users
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    
    // Get sample user (without sensitive data)
    const sampleUser = await db.query(`
      SELECT id, username, display_name, name, phone_number, is_private, created_at 
      FROM users 
      LIMIT 1
    `);
    
    res.json({ 
      status: 'OK',
      message: 'Users table check successful',
      tableColumns: tableInfo.rows,
      userCount: userCount.rows[0].count,
      sampleUser: sampleUser.rows[0] || null
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'ERROR',
      message: 'Users table check failed',
      error: error.message
    });
  }
});

// Test login process (without actual authentication)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required for test' });
    }
    
    // Test the same query used in login
    const userResult = await db.query(
      'SELECT id, username, display_name, name, phone_number, is_private FROM users WHERE display_name = $1 OR username = $1 OR name = $1',
      [name]
    );
    
    res.json({ 
      status: 'OK',
      message: 'Login query test successful',
      queryUsed: 'SELECT ... FROM users WHERE display_name = $1 OR username = $1 OR name = $1',
      searchTerm: name,
      foundUsers: userResult.rows.length,
      users: userResult.rows
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'ERROR',
      message: 'Login query test failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test environment variables
router.get('/env', async (_req: Request, res: Response) => {
  try {
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET (hidden)' : 'NOT SET',
      PORT: process.env.PORT || 'default (4000)',
    };
    
    res.json({ 
      status: 'OK',
      message: 'Environment variables check',
      environment: envVars
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'ERROR',
      message: 'Environment check failed',
      error: error.message
    });
  }
});

// Test authentication
router.get('/auth', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ 
    status: 'OK',
    message: 'Authentication successful',
    user: req.user
  });
});

// Test all routes
router.get('/routes', (_req: Request, res: Response) => {
  const routes = [
    { method: 'POST', path: '/api/auth/register', description: 'Register a new user' },
    { method: 'POST', path: '/api/auth/login', description: 'Login with existing credentials' },
    { method: 'GET', path: '/api/users/me', description: 'Get current user profile' },
    { method: 'GET', path: '/api/workouts', description: 'List user workouts' },
    { method: 'POST', path: '/api/workouts', description: 'Create a new workout' },
    { method: 'GET', path: '/api/posts', description: 'List social feed posts' },
    { method: 'POST', path: '/api/posts', description: 'Create a new post' },
  ];
  
  res.json({ 
    status: 'OK',
    message: 'Available routes',
    routes
  });
});

export default router;
