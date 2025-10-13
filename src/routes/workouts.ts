import express from 'express';
import { getUserWorkouts, createWorkout, updateWorkout, deleteWorkout } from '../controllers/workoutController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get workouts for current authenticated user
router.get('/', authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  (req as any).params = { ...req.params, userId };
  return getUserWorkouts(req, res);
});

router.get('/user/:userId', authenticateToken, getUserWorkouts);
router.post('/', authenticateToken, createWorkout);
router.put('/:workoutId', authenticateToken, updateWorkout);
router.delete('/:workoutId', authenticateToken, deleteWorkout);

export default router;