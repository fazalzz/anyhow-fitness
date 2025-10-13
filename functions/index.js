const functions = require('firebase-functions');

const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Create Express app
const app = express();

// Configure CORS
const PRIMARY_ORIGIN = 'https://fayegym-e116b.web.app';

const DEFAULT_ALLOWED_ORIGINS = [
  PRIMARY_ORIGIN,
  'https://fayegym-e116b.firebaseapp.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const normalizeOrigin = (value) => value.trim().toLowerCase().replace(/\/$/, '');

const allowedOrigins = new Set(
  [...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins].map(normalizeOrigin),
);

const resolveAllowedOrigin = (origin) => {
  if (!origin) {
    return PRIMARY_ORIGIN;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (allowedOrigins.has(normalizedOrigin)) {
    return origin;
  }

  return false;
};

const corsOptions = {
  origin(origin, callback) {
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

app.use(express.json());

// Import database connection
const { query } = require('./database');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0]
    });

    // Store user profile in database
    await query(
      'INSERT INTO users (firebase_uid, email, display_name, created_at) VALUES ($1, $2, $3, NOW())',
      [userRecord.uid, email, displayName || email.split('@')[0]]
    );

    res.status(201).json({
      message: 'User created successfully',
      uid: userRecord.uid
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // For Firebase Auth, login is typically handled client-side
    // This endpoint can be used for additional server-side validation
    res.json({ message: 'Login validation successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Middleware to verify Firebase token
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// User profile routes
app.get('/users/profile', authenticateUser, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Workout routes
app.get('/workouts', authenticateUser, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM workouts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.uid]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Workouts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

app.post('/workouts', authenticateUser, async (req, res) => {
  try {
    const { exercises, duration, notes } = req.body;
    
    const result = await query(
      'INSERT INTO workouts (user_id, exercises, duration, notes, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [req.user.uid, JSON.stringify(exercises), duration, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Workout creation error:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// Body weight tracking routes
app.get('/bodyweight', authenticateUser, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM bodyweight_logs WHERE user_id = $1 ORDER BY logged_at DESC',
      [req.user.uid]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Bodyweight fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch bodyweight data' });
  }
});

app.post('/bodyweight', authenticateUser, async (req, res) => {
  try {
    const { weight, unit = 'lbs' } = req.body;
    
    if (!weight || weight <= 0) {
      return res.status(400).json({ error: 'Valid weight is required' });
    }

    const result = await query(
      'INSERT INTO bodyweight_logs (user_id, weight, unit, logged_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [req.user.uid, weight, unit]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Bodyweight logging error:', error);
    res.status(500).json({ error: 'Failed to log bodyweight' });
  }
});

// Social/Posts routes
app.get('/posts', authenticateUser, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, u.display_name as author_name 
      FROM posts p 
      JOIN users u ON p.user_id = u.firebase_uid 
      ORDER BY p.created_at DESC 
      LIMIT 50
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Posts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/posts', authenticateUser, async (req, res) => {
  try {
    const { content, workout_data } = req.body;
    
    if (!content && !workout_data) {
      return res.status(400).json({ error: 'Content or workout data is required' });
    }

    const result = await query(
      'INSERT INTO posts (user_id, content, workout_data, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [req.user.uid, content, workout_data ? JSON.stringify(workout_data) : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Export the Express app for use in Cloud Run (via server.js)
exports.app = app;

// Export Firebase Functions
exports.api = functions.https.onRequest(app);