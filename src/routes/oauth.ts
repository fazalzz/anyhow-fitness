import express from 'express';
import passport from '../utils/oauth';
import { generateTokenPair } from '../utils/jwt';
import { logger } from '../utils/logger';

const router = express.Router();

// Initialize OAuth
router.use(passport.initialize());

// Google OAuth login
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!user) {
        return res.redirect('/login?error=oauth_failed');
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } = generateTokenPair(user.id);
      
      // Set secure cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      };

      res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 min
      res.cookie('refreshToken', refreshToken, cookieOptions);

      logger.info(`OAuth login successful for user: ${user.id}`);
      
      // Redirect to dashboard
      res.redirect('/dashboard');
    } catch (error) {
      logger.error('OAuth callback error:', error);
      res.redirect('/login?error=oauth_callback_failed');
    }
  }
);

// OAuth logout
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;