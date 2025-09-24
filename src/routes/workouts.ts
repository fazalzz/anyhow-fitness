import express from 'express';
import { getUserWorkouts, createWorkout } from '../controllers/workoutController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get workouts for current authenticated user
router.get('/', authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  req.params.userId = userId;
  return getUserWorkouts(req, res);
});

router.get('/user/:userId', authenticateToken, getUserWorkouts);
router.post('/', authenticateToken, createWorkout);

export default router;