import express from 'express';
import {
  getFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendship
} from '../controllers/friendshipController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, getFriendships);
router.post('/request', authenticateToken, sendFriendRequest);
router.put('/:friendshipId/accept', authenticateToken, acceptFriendRequest);
router.delete('/:friendshipId', authenticateToken, deleteFriendship);

export default router;