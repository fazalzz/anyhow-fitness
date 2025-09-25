import { Request, Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { hasAccessToUserData } from '../utils/authorization';

export const getUserBodyWeightEntries = async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = req.user.id;
    const targetUserId = req.params.userId;

    const hasAccess = await hasAccessToUserData(requesterId, targetUserId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      'SELECT * FROM body_weight_entries WHERE user_id = $1 ORDER BY date DESC',
      [targetUserId]
    );

    // Transform field names for frontend
    const transformedEntries = result.rows.map((entry: any) => ({
      id: entry.id,
      userId: entry.user_id,
      weight: parseFloat(entry.weight),
      date: entry.date,
      createdAt: entry.created_at
    }));

    res.json(transformedEntries);
  } catch (error) {
    console.error('Get body weight entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBodyWeightEntry = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { weight, date } = req.body;

    const result = await db.query(
      `INSERT INTO body_weight_entries (user_id, weight, date) 
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, weight, date || new Date()]
    );

    // Transform field names for frontend
    const entry = result.rows[0];
    const transformedEntry = {
      id: entry.id,
      userId: entry.user_id,
      weight: parseFloat(entry.weight),
      date: entry.date,
      createdAt: entry.created_at
    };

    res.status(201).json(transformedEntry);
  } catch (error) {
    console.error('Create body weight entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBodyWeightEntry = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { weight, date } = req.body;

    // Check if entry belongs to user
    const checkResult = await db.query(
      'SELECT user_id FROM body_weight_entries WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this entry' });
    }

    const result = await db.query(
      `UPDATE body_weight_entries 
       SET weight = $1, date = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 AND user_id = $4 
       RETURNING *`,
      [weight, date, id, userId]
    );

    // Transform field names for frontend
    const entry = result.rows[0];
    const transformedEntry = {
      id: entry.id,
      userId: entry.user_id,
      weight: parseFloat(entry.weight),
      date: entry.date,
      createdAt: entry.created_at
    };

    res.json(transformedEntry);
  } catch (error) {
    console.error('Update body weight entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteBodyWeightEntry = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if entry belongs to user
    const checkResult = await db.query(
      'SELECT user_id FROM body_weight_entries WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this entry' });
    }

    await db.query(
      'DELETE FROM body_weight_entries WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Delete body weight entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
