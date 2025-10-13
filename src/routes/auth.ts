import express from 'express';
import {
  register,
  login,
  verifyTwoFactorCode,
  resendTwoFactorCode,
  requestResetCode,
  resetPin,
  validateToken,
  logout,
  refreshToken
} from '../controllers/authController';
import { validateRegister, validateLogin } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/verify-2fa', verifyTwoFactorCode);
router.post('/resend-2fa', resendTwoFactorCode);
router.post('/forgot-pin/request-code', requestResetCode);
router.post('/forgot-pin/reset', resetPin);
router.get('/validate', authenticateToken, validateToken);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

export default router;