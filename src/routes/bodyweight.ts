import express from 'express';
import { getUserBodyWeightEntries, createBodyWeightEntry } from '../controllers/bodyWeightController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get body weight entries for current authenticated user
router.get('/', authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  req.params.userId = userId;
  return getUserBodyWeightEntries(req, res);
});

router.get('/user/:userId', authenticateToken, getUserBodyWeightEntries);
router.post('/', authenticateToken, createBodyWeightEntry);

export default router;