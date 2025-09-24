import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Test database connection
router.get('/db', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
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