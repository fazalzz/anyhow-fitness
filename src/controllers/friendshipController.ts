import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getFriendships = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT f.*, 
              u1.name as requester_name, u1.avatar as requester_avatar,
              u2.name as receiver_name, u2.avatar as receiver_avatar
       FROM friendships f
       JOIN users u1 ON f.requester_id = u1.id
       JOIN users u2 ON f.receiver_id = u2.id
       WHERE f.requester_id = $1 OR f.receiver_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get friendships error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = req.user.id;
    const { receiverId } = req.body;

    if (requesterId === receiverId) {
      return res.status(400).json({ error: 'Cannot send request to yourself' });
    }

    // Check if friendship already exists
    const existingFriendship = await pool.query(
      `SELECT * FROM friendships 
       WHERE (requester_id = $1 AND receiver_id = $2) 
          OR (requester_id = $2 AND receiver_id = $1)`,
      [requesterId, receiverId]
    );

    if (existingFriendship.rows.length > 0) {
      return res.status(409).json({ error: 'Friendship already exists' });
    }

    const result = await pool.query(
      `INSERT INTO friendships (requester_id, receiver_id) 
       VALUES ($1, $2) RETURNING *`,
      [requesterId, receiverId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const friendshipId = req.params.friendshipId;

    // Verify user is the receiver of the request
    const friendshipResult = await pool.query(
      'SELECT * FROM friendships WHERE id = $1 AND receiver_id = $2 AND status = $3',
      [friendshipId, userId, 'pending']
    );

    if (friendshipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const result = await pool.query(
      `UPDATE friendships SET status = $1 
       WHERE id = $2 RETURNING *`,
      ['accepted', friendshipId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteFriendship = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const friendshipId = req.params.friendshipId;

    // Check if the current user is part of the friendship
    const friendshipResult = await pool.query(
      'SELECT * FROM friendships WHERE id = $1 AND (requester_id = $2 OR receiver_id = $2)',
      [friendshipId, userId]
    );

    if (friendshipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    await pool.query('DELETE FROM friendships WHERE id = $1', [friendshipId]);

    res.status(204).send();
  } catch (error) {
    console.error('Delete friendship error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};