import { Request, Response } from 'express';
import { pool } from '../config/database';
import { hashPin, comparePin } from '../utils/bcrypt';
import { AuthRequest } from '../middleware/auth';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone_number, avatar, is_private, created_at FROM users'
    );
    
    // Transform field names for frontend
    const transformedUsers = result.rows.map(user => {
      const { phone_number, ...userData } = user;
      return {
        ...userData,
        phoneNumber: phone_number // Transform snake_case to camelCase
      };
    });
    
    res.json(transformedUsers);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { name, phoneNumber, avatar, is_private } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           phone_number = COALESCE($2, phone_number),
           avatar = COALESCE($3, avatar),
           is_private = COALESCE($4, is_private),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, phone_number, avatar, is_private, created_at, updated_at`,
      [name, phoneNumber, avatar, is_private, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Transform field names for frontend
    const { phone_number, ...userData } = user;
    const transformedUser = {
      ...userData,
      phoneNumber: phone_number // Transform snake_case to camelCase
    };

    res.json(transformedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePin = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { currentPin, newPin } = req.body;

    // Get current PIN hash
    const userResult = await pool.query(
      'SELECT pin_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current PIN
    const isPinValid = await comparePin(currentPin, userResult.rows[0].pin_hash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Incorrect current PIN' });
    }

    // Hash new PIN
    const newPinHash = await hashPin(newPin);

    // Update PIN
    await pool.query(
      'UPDATE users SET pin_hash = $1 WHERE id = $2',
      [newPinHash, userId]
    );

    res.json({ message: 'PIN changed successfully' });
  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
