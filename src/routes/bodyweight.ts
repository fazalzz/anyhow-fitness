import express from 'express';
import { getUserBodyWeightEntries, createBodyWeightEntry, updateBodyWeightEntry, deleteBodyWeightEntry } from '../controllers/bodyWeightController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get body weight entries for current authenticated user
router.get('/', authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  (req as any).params = { ...req.params, userId };
  return getUserBodyWeightEntries(req, res);
});

router.get('/user/:userId', authenticateToken, getUserBodyWeightEntries);
router.post('/', authenticateToken, createBodyWeightEntry);
router.put('/:id', authenticateToken, updateBodyWeightEntry);
router.delete('/:id', authenticateToken, deleteBodyWeightEntry);

export default router;