import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
// Load environment variables explicitly so compiled code (src/dist/src/index.js) can locate the root .env
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Resolve .env at project root regardless of CWD when running compiled output
(() => {
  const candidates = [
    // When running compiled file at src/dist/src/index.js
    path.resolve(__dirname, '../../../.env'),
    // When running ts directly
    path.resolve(__dirname, '../.env'),
    // Fallback to current working directory
    path.resolve(process.cwd(), '.env')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      break;
    }
  }
})();
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import workoutRoutes from './routes/workouts';
import postRoutes from './routes/posts';
import bodyWeightRoutes from './routes/bodyweight';
import friendshipRoutes from './routes/friendships';
import arkkiesRoutes from './routes/arkkies';
import gymRoutes from './routes/gyms';
import setupRoutes from './routes/setup';
import {
  securityHeaders,
  enforceHTTPS,
  sanitizeInput,
  securityLogger,
  suspiciousActivityDetector,
  apiRateLimit,
  authRateLimit,
  speedLimiter
} from './middleware/security';

const app = express();
const PORT = process.env.PORT || 4000; // Always use 4000

// Security middleware (applied first)
app.use(enforceHTTPS);
app.use(securityHeaders);
app.use(securityLogger);
app.use(suspiciousActivityDetector);
app.use(speedLimiter);

// Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Add keep-alive headers for better performance
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=5, max=1000');
  next();
});

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'http://localhost:4174',
    // Add environment variable for production frontend URL
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
    // Allow all vercel.app subdomains in production
    /\.vercel\.app$/
  ],
  credentials: true
}));

// Body parsing with security limits
app.use(express.json({ 
  limit: '2mb', // Reduced from 10mb for security
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '2mb',
  parameterLimit: 100 // Prevent parameter pollution
}));

// Input sanitization
app.use(sanitizeInput);

// Rate limiting
app.use('/api', apiRateLimit);

// Routes with specific rate limiting for auth
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/bodyweight', bodyWeightRoutes);
app.use('/api/friendships', friendshipRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/arkkies', arkkiesRoutes);
app.use('/api/setup', setupRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Anyhow Fitness API Server',
    endpoints: {
      auth: '/api/auth/login or /api/auth/register',
      health: '/api/health',
      setup: 'POST /api/setup/init (initialize database)'
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Quick database health check to keep connections warm
    const { db } = await import('./config/database');
    const isHealthy = await db.healthCheck();
    
    res.json({ 
      status: 'OK', 
      message: 'Server is running',
      database: isHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Check required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Start server
const server = app.listen(PORT, () => {
  console.log('=================================');
  console.log(`Server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET  /');
  console.log('- GET  /api/health');
  console.log('- POST /api/auth/register');
  console.log('- POST /api/auth/login');
  console.log('=================================');
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Rejection:', reason);
  // Don't exit here, just log it
});