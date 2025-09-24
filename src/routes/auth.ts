import express from 'express';
import {
  register,
  login,
  requestResetCode,
  resetPin,
  validateToken,
  logout
} from '../controllers/authController';
import { validateRegister, validateLogin } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgot-pin/request-code', requestResetCode);
router.post('/forgot-pin/reset', resetPin);
router.get('/validate', authenticateToken, validateToken);
router.post('/logout', logout);

export default router;