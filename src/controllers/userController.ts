import { Request, Response } from 'express';
import { db } from '../config/database';
import { hashPin, comparePin } from '../utils/bcrypt';
import { AuthRequest } from '../middleware/auth';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      'SELECT id, display_name, phone_number, avatar, is_private, created_at FROM users'
    );
    // Transform field names for frontend
    const transformedUsers = result.rows.map((user: any) => ({
      id: user.id,
      displayName: user.display_name,
      avatar: user.avatar,
      isPrivate: user.is_private,
      phoneNumber: user.phone_number,
      createdAt: user.created_at
    }));
    res.json(transformedUsers);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { displayName, phoneNumber, avatar, isPrivate } = req.body;

    console.log('Update user request:', { userId, displayName, phoneNumber, avatar, isPrivate });

    const result = await db.query(
      `UPDATE users 
       SET display_name = COALESCE($1, display_name), 
           phone_number = COALESCE($2, phone_number),
           avatar = COALESCE($3, avatar),
           is_private = COALESCE($4, is_private),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, display_name, phone_number, avatar, is_private, created_at, updated_at`,
      [displayName, phoneNumber, avatar, isPrivate, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    // Transform field names for frontend
    const transformedUser = {
      id: user.id,
      displayName: user.display_name,
      avatar: user.avatar,
      isPrivate: user.is_private,
      phoneNumber: user.phone_number,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    console.log('User updated successfully:', transformedUser);
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
    const userResult = await db.query(
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
    await db.query(
      'UPDATE users SET pin_hash = $1 WHERE id = $2',
      [newPinHash, userId]
    );

    res.json({ message: 'PIN changed successfully' });
  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchUserByDisplayName = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const result = await db.query(
      'SELECT id, display_name, phone_number, avatar, is_private, created_at FROM users WHERE display_name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const transformedUser = {
      id: user.id,
      displayName: user.display_name,
      avatar: user.avatar,
      isPrivate: user.is_private,
      phoneNumber: user.phone_number,
      createdAt: user.created_at
    };

    res.json(transformedUser);
  } catch (error) {
    console.error('Search user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
