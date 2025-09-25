import express from 'express';
import { getAllUsers, updateUser, changePin, searchUserByDisplayName } from '../controllers/userController';
import { getUserCustomExercises, createCustomExercise, deleteCustomExercise } from '../controllers/customExerciseController';
import { authenticateToken } from '../middleware/auth';
import { validateChangePin } from '../middleware/validation';

const router = express.Router();

// Session status endpoint
router.get('/me/status', authenticateToken, (req: any, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      name: req.user.name
    }
  });
});

router.get('/', authenticateToken, getAllUsers);
router.get('/search', authenticateToken, searchUserByDisplayName);
router.put('/me', authenticateToken, updateUser);
router.put('/me/change-pin', authenticateToken, validateChangePin, changePin);

// Custom exercises endpoints
router.get('/custom-exercises', authenticateToken, getUserCustomExercises);
router.post('/custom-exercises', authenticateToken, createCustomExercise);
router.delete('/custom-exercises/:exerciseId', authenticateToken, deleteCustomExercise);

export default router;