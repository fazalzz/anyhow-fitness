import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const generateTokenPair = (payload: object): TokenPair => {
  // Short-lived access token (15 minutes)
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  
  // Long-lived refresh token (7 days)
  const refreshToken = jwt.sign(
    { ...payload, tokenId: crypto.randomUUID() }, 
    JWT_REFRESH_SECRET, 
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Legacy function for backward compatibility
export const generateToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

export const refreshAccessToken = (refreshToken: string): string => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    // Remove tokenId from payload for new access token
    const { tokenId, iat, exp, ...payload } = decoded;
    return generateToken(payload);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};