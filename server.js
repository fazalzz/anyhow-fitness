// Cloud Run entrypoint - Use the backend app directly

require('dotenv').config();

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

// Use the backend app directly - it already has proper CORS configuration
const PORT = parseInt(process.env.PORT || '8080');

// Start the server directly with the backend app
const server = backendApp.listen(PORT, '0.0.0.0', () => {
  console.log(`=== Cloud Run Server Started ===`);
  console.log(`Port: ${PORT}`);
  console.log(`URL: https://anyhow-fitness-api-236180381075.us-central1.run.app`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Allowed Origins: ${process.env.ALLOWED_ORIGINS}`);
  console.log('=====================================');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});