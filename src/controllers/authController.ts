import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { mapUserToResponse } from '../utils/userMapper';
import { sendTwoFactorCodeEmail } from '../utils/email';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_TOKEN_EXPIRY: SignOptions['expiresIn'] = (process.env.ACCESS_TOKEN_EXPIRY as SignOptions['expiresIn']) || '24h';
const REFRESH_TOKEN_EXPIRY: SignOptions['expiresIn'] = (process.env.REFRESH_TOKEN_EXPIRY as SignOptions['expiresIn']) || '30d';

const TWO_FACTOR_EXPIRY_SECONDS = parseInt(process.env.TWO_FACTOR_EXPIRY_SECONDS ?? '600', 10);

const generateTwoFactorCode = (): string => Math.floor(100000 + Math.random() * 900000).toString();

const createTwoFactorSession = async (user: any): Promise<{ token: string; debugCode?: string }> => {
  if (!user.email) {
    throw new Error('User does not have an email configured');
  }

  const expiresAt = new Date(Date.now() + TWO_FACTOR_EXPIRY_SECONDS * 1000);
  const code = generateTwoFactorCode();
  const codeHash = await bcrypt.hash(code, 10);
  const token = crypto.randomUUID();

  await db.query('DELETE FROM user_two_factor_tokens WHERE user_id = $1 OR expires_at < NOW()', [user.id]);
  await db.query(
    'INSERT INTO user_two_factor_tokens (user_id, token, code_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [user.id, token, codeHash, expiresAt],
  );

  try {
    await sendTwoFactorCodeEmail(user.email, code, Math.ceil(TWO_FACTOR_EXPIRY_SECONDS / 60));
    if (process.env.TWO_FACTOR_DEBUG === 'true') {
      console.info(`[2FA][DEBUG] Verification code for ${user.email}: ${code}`);
    }
  } catch (emailError) {
    console.error('Failed to send two-factor email:', emailError);
  }

  return {
    token,
    debugCode: process.env.TWO_FACTOR_DEBUG === 'true' ? code : undefined,
  };
};

const cleanupTwoFactorSessions = async (): Promise<void> => {
  await db.query('DELETE FROM user_two_factor_tokens WHERE expires_at < NOW() OR consumed = TRUE');
};

const generateAccessToken = (user: any) =>
  jwt.sign(
    { id: user.id, name: user.display_name },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );

const generateRefreshToken = (user: any) =>
  jwt.sign(
    { id: user.id, name: user.display_name },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );

// Helper function to hash PINs
const hashPin = async (pin: string) => {
  return await bcrypt.hash(pin, 10);
};

// Helper function to compare PINs
const comparePin = async (pin: string, hash: string) => {
  return await bcrypt.compare(pin, hash);
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, pin, email } = req.body;

    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' && email.trim().length > 0
      ? email.trim().toLowerCase()
      : '';

    if (!normalizedName || !pin || !normalizedEmail) {
      res.status(400).json({ error: 'Name, PIN, and email are required' });
      return;
    }

    const duplicateCheck = await db.query(
      `SELECT id FROM users
       WHERE display_name = $1
          OR LOWER(email) = $2
       LIMIT 1`,
      [normalizedName, normalizedEmail],
    );

    if (duplicateCheck.rows.length > 0) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    const pinHash = await hashPin(pin);

    const result = await db.query(
      'INSERT INTO users (display_name, pin_hash, email) VALUES ($1, $2, $3) RETURNING id, display_name, email, created_at',
      [normalizedName, pinHash, normalizedEmail],
    );

    const user = result.rows[0];
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      message: 'User created successfully',
      user: mapUserToResponse(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin } = req.body;

    const identifierCandidates = [
      req.body.name,
      req.body.username,
      req.body.email,
    ]
      .map((value: unknown) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);

    if (!pin) {
      res.status(400).json({ error: 'PIN is required' });
      return;
    }

    if (identifierCandidates.length === 0) {
      res.status(400).json({ error: 'A username, name, or email is required' });
      return;
    }

    let user: any | undefined;

    for (const identifier of identifierCandidates) {
      const result = await db.query(
        'SELECT * FROM users WHERE display_name = $1 OR LOWER(email) = LOWER($1) LIMIT 1',
        [identifier],
      );

      if (result.rows.length > 0) {
        user = result.rows[0];
        break;
      }
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.email) {
      res.status(400).json({ error: 'Email-based two-factor authentication is not available for this account' });
      return;
    }

    const isPinValid = await comparePin(pin, user.pin_hash);
    if (!isPinValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    await cleanupTwoFactorSessions();
    const { token, debugCode } = await createTwoFactorSession(user);

    res.json({
      message: 'Verification code sent to your email address',
      twoFactorRequired: true,
      twoFactorToken: token,
      email: user.email,
      debugCode,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const verifyTwoFactorCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, code } = req.body as { token?: string; code?: string };

    await cleanupTwoFactorSessions();

    if (!token || !code) {
      res.status(400).json({ error: 'Verification token and code are required' });
      return;
    }

    const sessionResult = await db.query(
      'SELECT * FROM user_two_factor_tokens WHERE token = $1',
      [token],
    );

    if (sessionResult.rows.length === 0) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    const session = sessionResult.rows[0];

    if (session.consumed || new Date(session.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Verification code has expired' });
      return;
    }

    const isMatch = await bcrypt.compare(code, session.code_hash);
    if (!isMatch) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    await db.query('UPDATE user_two_factor_tokens SET consumed = TRUE WHERE token = $1', [token]);

    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [session.user_id]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      message: 'Two-factor verification successful',
      user: mapUserToResponse(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Verify two-factor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resendTwoFactorCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body as { token?: string };

    await cleanupTwoFactorSessions();

    if (!token) {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    const sessionResult = await db.query(
      'SELECT user_id FROM user_two_factor_tokens WHERE token = $1',
      [token],
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({ error: 'Verification session not found' });
      return;
    }

    const userId = sessionResult.rows[0].user_id;
    await db.query('UPDATE user_two_factor_tokens SET consumed = TRUE WHERE token = $1', [token]);

    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];
    if (!user.email) {
      res.status(400).json({ error: 'Email-based two-factor authentication is not available for this account' });
      return;
    }

    const { token: newToken } = await createTwoFactorSession(user);

    res.json({
      message: 'A new verification code has been sent to your email address',
      twoFactorToken: newToken,
      email: user.email,
    });
  } catch (error) {
    console.error('Resend two-factor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const validateToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // If we reach here, the token is valid (middleware already verified it)
    const user = req.user;
    
    // Optionally, fetch fresh user data from database
    const result = await db.query(
      'SELECT id, display_name, email FROM users WHERE id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      valid: true,
      user: mapUserToResponse(result.rows[0]),
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // For JWT tokens, logout is typically handled client-side by removing the token
  res.json({ message: 'Logout successful' });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: incomingRefreshToken } = req.body || {};

    if (!incomingRefreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const decoded = jwt.verify(incomingRefreshToken, JWT_REFRESH_SECRET) as JwtPayload;

    if (!decoded || typeof decoded !== 'object' || !decoded.id) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const result = await db.query(
      'SELECT id, display_name, email FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: mapUserToResponse(user),
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

export const requestResetCode = async (req: Request, res: Response): Promise<void> => {
  // Implement password reset logic here
  res.json({ message: 'Reset code functionality not implemented yet' });
};

export const resetPin = async (req: Request, res: Response): Promise<void> => {
  // Implement PIN reset logic here
  res.json({ message: 'PIN reset functionality not implemented yet' });
};

export const changePin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPin, newPin } = req.body;
    const userId = req.user.id;

    if (!currentPin || !newPin) {
      res.status(400).json({ error: 'Current PIN and new PIN are required' });
      return;
    }

    // Get current user
    const result = await db.query(
      'SELECT pin_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    // Verify current PIN
    const isPinValid = await comparePin(currentPin, user.pin_hash);
    if (!isPinValid) {
      res.status(401).json({ error: 'Current PIN is incorrect' });
      return;
    }

    // Hash new PIN
    const newPinHash = await hashPin(newPin);

    // Update PIN
    await db.query(
      'UPDATE users SET pin_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPinHash, userId]
    );

    res.json({ message: 'PIN changed successfully' });
  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

