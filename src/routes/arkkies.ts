import { Router } from 'express';
import * as arkkiesController from '../controllers/arkkiesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All gym access routes require authentication
router.use(authenticateToken);

// Check existing session status
router.get('/session-status', arkkiesController.getSessionStatus);

// Test endpoint
router.post('/test', (req, res) => {
  console.log('Arkkies test route hit');
  res.json({ success: true, message: 'Test route working' });
});

// Login to Arkkies
router.post('/login', (req, res, next) => {
  console.log('Arkkies login route hit:', req.method, req.path);
  console.log('Request body:', req.body);
  console.log('Auth header:', req.headers.authorization);
  next();
}, arkkiesController.loginToArkkies);

// Get available outlets
router.get('/outlets', arkkiesController.getOutlets);

// Get user's active subscriptions
router.get('/subscriptions', arkkiesController.getSubscriptions);

// Test real API integration
router.get('/test-real-api', arkkiesController.testRealAPI);

// Test enhanced API with dynamic booking discovery
router.post('/test-enhanced-api', arkkiesController.testEnhancedAPI);

// COMPLETE AUTOMATION: Book + Unlock Door in one action
router.post('/automated-book-unlock', arkkiesController.automatedBookAndUnlock);

// Test improved automation system
router.post('/test-improved-automation', arkkiesController.testImprovedAutomation);

// Book gym slot and open door (legacy)
router.post('/book-and-access', arkkiesController.bookAndAccessGym);

// Get booking history
router.get('/bookings', arkkiesController.getBookingHistory);

// Debug endpoint to analyze website structure
router.post('/debug-page', arkkiesController.debugPageStructure);

export default router;