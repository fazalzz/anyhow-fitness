import { Request as ExpressRequest, Response } from 'express';
import { db } from '../config/database';
import { hashPin, comparePin } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';
import { sendSms } from '../utils/twilio';
import { asyncHandler, sendBadRequest, sendServerError, STATUS } from '../utils/errorHandler';
import { ApiError } from '../types';

interface Request extends ExpressRequest {
  body: {
    name?: string; // Still using name as input for backward compatibility, mapped to displayName internally
    pin?: string;
    phoneNumber?: string;
    code?: string;
    newPin?: string;
    currentPin?: string;
  }
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  console.log('Registration request received:', {
    body: req.body,
    headers: req.headers['content-type']
  });

  const { name: displayName, pin, phoneNumber } = req.body;

  // Validate input
  if (!displayName || !pin || !phoneNumber) {
    console.log('Missing required fields:', { displayName, pin, phoneNumber });
    throw new ApiError('All fields are required', STATUS.BAD_REQUEST);
  }

  if (pin.length !== 8 || !/^\d+$/.test(pin)) {
    throw new ApiError('PIN must be 8 digits', STATUS.BAD_REQUEST);
  }

  // Check if user exists (by phone number)
  const userExists = await db.query(
    'SELECT id FROM users WHERE phone_number = $1',
    [phoneNumber]
  );

  if (userExists.rows.length > 0) {
    throw new ApiError('User already exists', STATUS.CONFLICT);
  }

  // Hash PIN
  const pinHash = await hashPin(pin);

  // Create user
  const newUser = await db.query(
    `INSERT INTO users (display_name, phone_number, pin_hash) 
     VALUES ($1, $2, $3) 
     RETURNING id, display_name, phone_number, avatar, is_private, created_at`,
    [displayName, phoneNumber, pinHash]
  );

  const user = newUser.rows[0];
  const transformedUser = {
    id: user.id,
    displayName: user.display_name,
    avatar: user.avatar,
    isPrivate: user.is_private,
    phoneNumber: user.phone_number,
    createdAt: user.created_at
  };

  // Generate token
  const token = generateToken({ id: user.id, name: user.display_name });

  res.status(STATUS.CREATED).json({
    token,
    user: transformedUser
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { name: displayName, pin } = req.body;

  // Find user by display name
  const userResult = await db.query(
    'SELECT * FROM users WHERE display_name = $1',
    [displayName]
  );

  if (userResult.rows.length === 0) {
    throw new ApiError('Invalid credentials', STATUS.UNAUTHORIZED);
  }

  const user = userResult.rows[0];

  // Verify PIN
  const isPinValid = await comparePin(pin || '', user.pin_hash);
  if (!isPinValid) {
    throw new ApiError('Invalid credentials', STATUS.UNAUTHORIZED);
  }

  // Generate token
  const token = generateToken({ id: user.id, name: user.display_name });

  // Remove sensitive data and transform field names for frontend
  const { pin_hash, otp_code, otp_expires_at, phone_number, display_name, ...userData } = user;
  
  const transformedUser = {
    ...userData,
    displayName: display_name, // Use display_name as displayName for frontend
    isPrivate: user.is_private, // Transform snake_case to camelCase
    phoneNumber: phone_number // Transform snake_case to camelCase
  };

  res.json({
    token,
    user: transformedUser
  });
});

export const requestResetCode = async (req: Request, res: Response) => {
  try {
    const { name: displayName } = req.body;

    // Find user
    const userResult = await db.query(
      'SELECT * FROM users WHERE display_name = $1',
      [displayName]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with OTP
    await db.query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3',
      [otpCode, otpExpires, user.id]
    );

    // Send SMS
    await sendSms(user.phone_number, `Your Anyhow Fitness verification code is: ${otpCode}`);

    res.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('Request reset code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPin = async (req: Request, res: Response) => {
  try {
    const { name: displayName, code, newPin } = req.body;

    // Find user
    const userResult = await db.query(
      'SELECT * FROM users WHERE display_name = $1',
      [displayName]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify OTP
    if (user.otp_code !== code || new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Hash new PIN
    const pinHash = await hashPin(newPin || '');

    // Update user
    await db.query(
      'UPDATE users SET pin_hash = $1, otp_code = NULL, otp_expires_at = NULL WHERE id = $2',
      [pinHash, user.id]
    );

    res.json({ message: 'PIN reset successfully' });
  } catch (error) {
    console.error('Reset PIN error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const validateToken = asyncHandler(async (req: Request, res: Response) => {
  // This function will be called after the auth middleware has verified the token
  // If we reach here, the token is valid and req.user should be set by the middleware
  const tokenUser = (req as any).user;
  
  if (!tokenUser) {
    throw new ApiError('User not found', STATUS.UNAUTHORIZED);
  }

  // Fetch full user data from database
  const userResult = await db.query(
    'SELECT id, display_name, phone_number, avatar, is_private, created_at FROM users WHERE id = $1',
    [tokenUser.id]
  );

  if (userResult.rows.length === 0) {
    throw new ApiError('User not found', STATUS.UNAUTHORIZED);
  }

  const user = userResult.rows[0];
  
  // Transform field names for frontend
  const { phone_number, display_name, ...userData } = user;
  const transformedUser = {
    ...userData,
    displayName: display_name,
    phoneNumber: phone_number // Transform snake_case to camelCase
  };

  res.json({ 
    success: true,
    data: { user: transformedUser }
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // For JWT tokens, we can't really "logout" server-side since JWTs are stateless
  // The client should remove the token from localStorage
  // However, we can provide a confirmation that the logout request was received
  
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
});
