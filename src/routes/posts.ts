import express from 'express';
import { getPosts, createPost } from '../controllers/postController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, getPosts);
router.post('/', authenticateToken, createPost);

export default router;