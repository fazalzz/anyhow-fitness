import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';

export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json([]);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ message: 'Post created successfully' });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};