import express, { Request, Response, NextFunction } from 'express';

import cors, { CorsOptions } from 'cors';

// Load environment variables explicitly so compiled code can locate the root .env
// But don't override existing environment variables (e.g., from Cloud Run)
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Only load .env file if critical environment variables are not already set
if (!process.env.DATABASE_URL || !process.env.NODE_ENV) {
  // Resolve .env at project root regardless of CWD when running compiled output
  const candidates = [
    // When running compiled file at src/dist/index.js
    path.resolve(__dirname, '../../../.env'),
    // When running ts directly
    path.resolve(__dirname, '../.env'),
    // Fallback to current working directory
    path.resolve(process.cwd(), '.env'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`Loading environment from: ${p}`);
      dotenv.config({ path: p });
      break;
    }
  }
} else {
  console.log('Using existing environment variables (skipping .env file)');
}

import authRoutes from './routes/auth';

import oauthRoutes from './routes/oauth';

import userRoutes from './routes/users';

import workoutRoutes from './routes/workouts';

import postRoutes from './routes/posts';

import bodyWeightRoutes from './routes/bodyweight';

import friendshipRoutes from './routes/friendships';

import arkkiesRoutes from './routes/arkkies';

import gymRoutes from './routes/gyms';

import setupRoutes from './routes/setup';

import migrationsRoutes from './routes/migrations';

import {
  securityHeaders,
  enforceHTTPS,
  sanitizeInput,
  securityLogger,
  suspiciousActivityDetector,
  apiRateLimit,
  authRateLimit,
  speedLimiter,
} from './middleware/security';

const app = express();
// Trust only the first proxy hop (e.g., Cloud Run / reverse proxies) so rate limiters get a stable client IP.
app.set('trust proxy', 1);

const PORT = parseInt(process.env.PORT || '4000');

// Comprehensive CORS setup for Google Cloud Run

const PRIMARY_ORIGIN = 'https://fayegym-e116b.web.app';

const DEFAULT_ALLOWED_ORIGINS = [
  PRIMARY_ORIGIN,
  'https://fayegym-e116b.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const normalizeOrigin = (value: string): string =>
  value.trim().toLowerCase().replace(/\/$/, '');

const allowedOrigins = new Set<string>(
  [...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins].map(normalizeOrigin),
);

const resolveAllowedOrigin = (origin: string | undefined): string | false => {
  if (!origin) {
    return PRIMARY_ORIGIN;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (allowedOrigins.has(normalizedOrigin)) {
    return origin;
  }

  return false;
};

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const resolvedOrigin = resolveAllowedOrigin(origin);

    if (resolvedOrigin !== false) {
      return callback(null, resolvedOrigin);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[cors] blocked origin: ${origin}`);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Client-Info',
    'X-Client-Version',
  ],
  exposedHeaders: ['Content-Length'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

// Basic middleware

app.use(
  express.json({
    limit: '2mb',

    type: 'application/json',
  }),
);

app.use(
  express.urlencoded({
    extended: false,

    limit: '2mb',

    parameterLimit: 100,
  }),
);

// Simple logging

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);

  next();
});

// Rate limiting

app.use('/api', apiRateLimit);

// Routes with specific rate limiting for auth

app.use('/api/auth', authRateLimit, authRoutes);

app.use('/auth', authRateLimit, oauthRoutes);

app.use('/api/users', userRoutes);

app.use('/api/workouts', workoutRoutes);

app.use('/api/posts', postRoutes);

app.use('/api/bodyweight', bodyWeightRoutes);

app.use('/api/friendships', friendshipRoutes);

app.use('/api/gyms', gymRoutes);

app.use('/api/arkkies', arkkiesRoutes);

app.use('/api/setup', setupRoutes);

app.use('/api/migrations', migrationsRoutes);

// Root endpoint

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Anyhow Fitness API Server',

    endpoints: {
      auth: '/api/auth/login or /api/auth/register',

      health: '/api/health',

      setup: 'POST /api/setup/init (initialize database)',
    },
  });
});

// Health check endpoint

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Quick database health check to keep connections warm

    const { healthCheck } = await import('./config/database');

    const isHealthy = await healthCheck();

    res.json({
      status: 'OK',

      message: 'Server is running',

      database: isHealthy ? 'connected' : 'disconnected',

      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',

      message: 'Health check failed',

      error: error instanceof Error ? error.message : 'Unknown error',
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

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    'Missing required environment variables:',
    missingEnvVars.join(', '),
  );

  process.exit(1);
}

// Start server only if this file is run directly (not imported)

if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
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
}

// Export the app for use in server.js

export default app;

module.exports = app;
