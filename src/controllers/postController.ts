import { Request, Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { hasAccessToUserData } from '../utils/authorization';

export const getPosts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    // Get posts from user and their accepted friends, plus public posts from non-friends
    const result = await db.query(
      `SELECT p.*, u.display_name as user_name, u.avatar as user_avatar
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1 
         OR p.user_id IN (
           SELECT CASE 
             WHEN requester_id = $1 THEN receiver_id 
             WHEN receiver_id = $1 THEN requester_id 
           END
           FROM friendships 
           WHERE (requester_id = $1 OR receiver_id = $1) AND status = 'accepted'
         )
         OR (u.is_private = false AND p.user_id NOT IN (
           SELECT CASE 
             WHEN requester_id = $1 THEN receiver_id 
             WHEN receiver_id = $1 THEN requester_id 
           END
           FROM friendships 
           WHERE (requester_id = $1 OR receiver_id = $1)
         ))
       ORDER BY p.date DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { workoutId, imageUrl, caption } = req.body;

    const result = await db.query(
      `INSERT INTO posts (user_id, workout_id, image_url, caption) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, workoutId, imageUrl, caption]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};