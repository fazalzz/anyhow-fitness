import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { mapUserToResponse } from '../utils/userMapper';

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const ensureAuthenticatedUser = (req: AuthRequest, res: Response): number | null => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return Number(userId);
};

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await db.query(
      `SELECT id, display_name, email, is_private, avatar, created_at, updated_at
         FROM users
         ORDER BY display_name ASC`,
    );

    const users = result.rows.map(mapUserToResponse);
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = ensureAuthenticatedUser(req, res);
    if (userId === null) {
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let parameterIndex = 1;

    const hasNameField = Object.prototype.hasOwnProperty.call(req.body, 'displayName')
      || Object.prototype.hasOwnProperty.call(req.body, 'name');
    if (hasNameField) {
      const rawName = req.body.displayName ?? req.body.name;
      const normalizedName = normalizeString(rawName);

      if (!normalizedName) {
        res.status(400).json({ error: 'Display name cannot be empty' });
        return;
      }

      const nameCheck = await db.query(
        'SELECT id FROM users WHERE display_name = $1 AND id <> $2 LIMIT 1',
        [normalizedName, userId],
      );

      if (nameCheck.rows.length > 0) {
        res.status(409).json({ error: 'Display name already in use' });
        return;
      }

      updates.push(`display_name = $${parameterIndex++}`);
      values.push(normalizedName);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      const normalizedEmail = normalizeString(req.body.email)?.toLowerCase() ?? null;

      if (normalizedEmail) {
        const emailCheck = await db.query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
          [normalizedEmail, userId],
        );

        if (emailCheck.rows.length > 0) {
          res.status(409).json({ error: 'Email already in use' });
          return;
        }
      }

      updates.push(`email = $${parameterIndex++}`);
      values.push(normalizedEmail);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'avatar')) {
      const avatarValue = typeof req.body.avatar === 'string' ? req.body.avatar : null;
      updates.push(`avatar = $${parameterIndex++}`);
      values.push(avatarValue);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'isPrivate')) {
      updates.push(`is_private = $${parameterIndex++}`);
      values.push(Boolean(req.body.isPrivate));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No valid fields provided for update' });
      return;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const updateQuery = `UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${parameterIndex}
      RETURNING id, display_name, email, is_private, avatar, created_at, updated_at`;

    const updated = await db.query(updateQuery, values);

    if (updated.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const user = updated.rows[0];

    res.json(mapUserToResponse(user));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchUserByDisplayName = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const termRaw = typeof req.query.name === 'string' ? req.query.name : '';
    const term = termRaw.trim();

    if (!term) {
      res.status(400).json({ error: 'Search term is required' });
      return;
    }

    const result = await db.query(
      `SELECT id, display_name, email, is_private, avatar, created_at, updated_at
         FROM users
         WHERE LOWER(display_name) = LOWER($1)
         LIMIT 1`,
      [term],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(mapUserToResponse(result.rows[0]));
  } catch (error) {
    console.error('Search user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = ensureAuthenticatedUser(req, res);
    if (userId === null) {
      return;
    }

    const { currentPin, newPin } = req.body as { currentPin?: string; newPin?: string };

    if (!currentPin || !newPin) {
      res.status(400).json({ error: 'Current PIN and new PIN are required' });
      return;
    }

    const userResult = await db.query('SELECT pin_hash FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];
    const isCurrentValid = await bcrypt.compare(currentPin, user.pin_hash);

    if (!isCurrentValid) {
      res.status(401).json({ error: 'Current PIN is incorrect' });
      return;
    }

    const newPinHash = await bcrypt.hash(newPin, 10);

    await db.query(
      'UPDATE users SET pin_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPinHash, userId],
    );

    res.json({ message: 'PIN changed successfully' });
  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


