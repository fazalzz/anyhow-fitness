import { Request as ExpressRequest, Response } from 'express';
import { db } from '../config/database';
import { hashPin, comparePin } from '../utils/bcrypt';
import { generateTokenPair, verifyToken, verifyRefreshToken } from '../utils/jwt';
import { sendOTPEmail, sendWelcomeEmail } from '../utils/email';
import { asyncHandler, sendBadRequest, sendServerError, STATUS } from '../utils/errorHandler';
import { ApiError } from '../types';

interface Request extends ExpressRequest {
  body: {
    name?: string; // Still using name as input for backward compatibility, mapped to displayName internally
    pin?: string;
    email?: string;
    phoneNumber?: string; // Keep for backward compatibility during migration
    code?: string;
    newPin?: string;
    currentPin?: string;
    refreshToken?: string;
  }
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  console.log('Registration request received:', {
    body: req.body,
    headers: req.headers['content-type']
  });

  const { name: displayName, pin, email } = req.body;

  // Validate input
  if (!displayName || !pin || !email) {
    console.log('Missing required fields:', { displayName, pin, email });
    throw new ApiError('All fields are required', STATUS.BAD_REQUEST);
  }

  if (pin.length !== 8 || !/^\d+$/.test(pin)) {
    throw new ApiError('PIN must be 8 digits', STATUS.BAD_REQUEST);
  }

  // Validate email format
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new ApiError('Invalid email format', STATUS.BAD_REQUEST);
  }

  // Check if user exists (by email)
  const userExists = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (userExists.rows.length > 0) {
    throw new ApiError('User already exists with this email', STATUS.CONFLICT);
  }

  // Hash PIN
  const pinHash = await hashPin(pin);

  // Create user
  const newUser = await db.query(
    `INSERT INTO users (display_name, email, pin_hash, email_verified) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, display_name, email, avatar, is_private, email_verified, created_at`,
    [displayName, email.toLowerCase(), pinHash, true] // Auto-verify for now
  );

  const user = newUser.rows[0];
  const transformedUser = {
    id: user.id,
    displayName: user.display_name,
    avatar: user.avatar,
    isPrivate: user.is_private,
    email: user.email,
    emailVerified: user.email_verified,
    createdAt: user.created_at
  };

  // Send welcome email
  try {
    await sendWelcomeEmail(email, displayName);
  } catch (emailError) {
    console.error('Failed to send welcome email:', emailError);
    // Don't fail registration if email fails
  }

  // Generate token pair
  const tokens = generateTokenPair({ id: user.id, name: user.display_name });

  res.status(STATUS.CREATED).json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
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

  // Generate token pair
  const tokens = generateTokenPair({ id: user.id, name: user.display_name });

  // Remove sensitive data and transform field names for frontend
  const { pin_hash, otp_code, otp_expires_at, phone_number, display_name, ...userData } = user;
  
  const transformedUser = {
    ...userData,
    displayName: display_name, // Use display_name as displayName for frontend
    isPrivate: user.is_private, // Transform snake_case to camelCase
    phoneNumber: phone_number // Transform snake_case to camelCase
  };

  res.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: transformedUser
  });
});

export const requestResetCode = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  // Validate input
  if (!email) {
    throw new ApiError('Email is required', STATUS.BAD_REQUEST);
  }

  // Validate email format
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new ApiError('Invalid email format', STATUS.BAD_REQUEST);
  }

  // Find user by email
  const userResult = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (userResult.rows.length === 0) {
    // Don't reveal if email exists or not for security
    return res.json({ message: 'If an account with this email exists, a verification code has been sent' });
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

  // Send OTP email
  try {
    await sendOTPEmail(user.email, otpCode, user.display_name);
    console.log(`[AUTH] OTP sent to ${user.email} for user ${user.display_name}`);
  } catch (emailError) {
    console.error('Failed to send OTP email:', emailError);
    throw new ApiError('Failed to send verification email', STATUS.INTERNAL_SERVER);
  }

  res.json({ message: 'If an account with this email exists, a verification code has been sent' });
});

export const resetPin = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, newPin } = req.body;

  // Validate input
  if (!email || !code || !newPin) {
    throw new ApiError('Email, code, and new PIN are required', STATUS.BAD_REQUEST);
  }

  if (newPin.length !== 8 || !/^\d+$/.test(newPin)) {
    throw new ApiError('PIN must be 8 digits', STATUS.BAD_REQUEST);
  }

  // Find user by email
  const userResult = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (userResult.rows.length === 0) {
    throw new ApiError('Invalid verification code', STATUS.BAD_REQUEST);
  }

  const user = userResult.rows[0];

  // Verify OTP
  if (!user.otp_code || user.otp_code !== code || new Date() > new Date(user.otp_expires_at)) {
    throw new ApiError('Invalid or expired verification code', STATUS.BAD_REQUEST);
  }

  // Hash new PIN
  const pinHash = await hashPin(newPin);

  // Update user
  await db.query(
    'UPDATE users SET pin_hash = $1, otp_code = NULL, otp_expires_at = NULL WHERE id = $2',
    [pinHash, user.id]
  );

  console.log(`[AUTH] PIN reset successfully for user ${user.display_name} (${user.email})`);
  res.json({ message: 'PIN reset successfully' });
});

export const validateToken = asyncHandler(async (req: Request, res: Response) => {
  // This function will be called after the auth middleware has verified the token
  // If we reach here, the token is valid and req.user should be set by the middleware
  const tokenUser = (req as any).user;
  
  if (!tokenUser) {
    throw new ApiError('User not found', STATUS.UNAUTHORIZED);
  }

  // Fetch full user data from database
  const userResult = await db.query(
    'SELECT id, display_name, email, avatar, is_private, email_verified, created_at FROM users WHERE id = $1',
    [tokenUser.id]
  );

  if (userResult.rows.length === 0) {
    throw new ApiError('User not found', STATUS.UNAUTHORIZED);
  }

  const user = userResult.rows[0];
  
  // Transform field names for frontend
  const { display_name, email_verified, ...userData } = user;
  const transformedUser = {
    ...userData,
    displayName: display_name,
    emailVerified: email_verified
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

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError('Refresh token is required', STATUS.BAD_REQUEST);
  }

  try {
    // Verify the refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Get user data from database to ensure user still exists
    const userResult = await db.query(
      'SELECT id, display_name FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      throw new ApiError('User not found', STATUS.UNAUTHORIZED);
    }

    const user = userResult.rows[0];

    // Generate new token pair
    const tokens = generateTokenPair({ id: user.id, name: user.display_name });

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    throw new ApiError('Invalid refresh token', STATUS.UNAUTHORIZED);
  }
});
