import { Router } from 'express';
import * as arkkiesController from '../controllers/arkkiesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All gym access routes require authentication
router.use(authenticateToken);

// Login to Arkkies
router.post('/login', arkkiesController.loginToArkkies);

// Get available outlets
router.get('/outlets', arkkiesController.getOutlets);

// Get user's active subscriptions
router.get('/subscriptions', arkkiesController.getSubscriptions);

// Book gym slot and open door
router.post('/book-and-access', arkkiesController.bookAndAccessGym);

// Get booking history
router.get('/bookings', arkkiesController.getBookingHistory);

export default router;