// Cloud Run entrypoint to run the same Express app used by Firebase Functions

require('dotenv').config();

const express = require('express');

const cors = require('cors');

// Import the compiled Express app from src/dist

let backendApp;

try {
  // Try to import from compiled dist directory

  backendApp = require('./src/dist/index.js');
  console.log('Successfully imported compiled backend from src/dist/index.js');
} catch (err) {
  console.log('Compiled backend not found, falling back to functions/index.js');
  console.log('Error:', err.message);

  // Fallback to functions approach

  const { app: functionsApp } = require('./functions/index');

  backendApp = functionsApp;
}

// Create a root express app to mount under both '/' and '/api'

const root = express();

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

const normalizeOrigin = (value) => value.trim().toLowerCase().replace(/\/$/, '');

const allowedOrigins = new Set(
  [...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins].map(normalizeOrigin),
);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  return allowedOrigins.has(normalizedOrigin);
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, PRIMARY_ORIGIN);
    }

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
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

// Global CORS (applies even to 404s)

root.use(cors(corsOptions));

root.options('*', cors(corsOptions));

// Mount the backend app at both roots so either path style works

root.use('/', backendApp);

root.use('/api', backendApp);

// Explicit mounts for common resources to ensure resolution

root.use('/auth', backendApp);

root.use('/posts', backendApp);

root.use('/workouts', backendApp);

root.use('/bodyweight', backendApp);

root.use('/users', backendApp);

// Optional: simple index to hint available paths

root.get('/', (req, res, next) => {
  if (req.path !== '/') return next();

  res.json({
    message: 'Anyhow Fitness API (Cloud Run)',

    hints: {
      health: ['/health', '/api/health'],

      auth: [
        '/auth/login',
        '/api/auth/login',
        '/auth/register',
        '/api/auth/register',
      ],
    },
  });
});

// Log registered routes for debugging

function listRoutes(app) {
  const routes = [];

  if (!app || !app._router || !app._router.stack) {
    console.log('No routes to list - app router not available');

    return;
  }

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods)

        .filter((m) => middleware.route.methods[m])

        .map((m) => m.toUpperCase());

      routes.push(`${methods.join(',')} ${middleware.route.path}`);
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      middleware.handle.stack.forEach((handler) => {
        const route = handler.route;

        if (route) {
          const methods = Object.keys(route.methods)

            .filter((m) => route.methods[m])

            .map((m) => m.toUpperCase());

          routes.push(`${methods.join(',')} ${route.path}`);
        }
      });
    }
  });

  console.log('Registered routes (functions app):', routes);
}

const PORT = process.env.PORT || 8080;

root.listen(PORT, () => {
  console.log(`Anyhow Fitness API running on port ${PORT}`);

  if (backendApp && backendApp._router) {
    try {
      listRoutes(backendApp);
    } catch (err) {
      console.log('Could not list routes:', err.message);
    }
  }
});
