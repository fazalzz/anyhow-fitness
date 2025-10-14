import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  bookSlotAndUnlockDoor,
  checkSessionStatus,
  listSupportedOutlets,
  loginAndStoreCredentials,
} from '../services/arkkiesService';

const ensureUserId = (req: AuthRequest): number => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('Authenticated user context is missing');
  }
  return Number(userId);
};

export const getSessionStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = ensureUserId(req);
    const status = await checkSessionStatus(userId);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Get session status error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const loginToArkkies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = ensureUserId(req);
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const result = await loginAndStoreCredentials(userId, email, password);
    res.json({
      success: true,
      data: {
        expiresAt: result.expiresAt,
      },
      message: 'Arkkies account connected successfully',
    });
  } catch (error) {
    console.error('Login to Arkkies error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const getOutlets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: listSupportedOutlets() });
  } catch (error) {
    console.error('Get outlets error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const getSubscriptions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const testRealAPI = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' });
};

export const testEnhancedAPI = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' });
};

export const automatedBookAndUnlock = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' });
};

export const testImprovedAutomation = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' });
};

export const bookAndAccessGym = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = ensureUserId(req);
    const { homeOutletId, targetOutletId, doorId } = req.body as {
      homeOutletId?: string;
      targetOutletId?: string;
      doorId?: string;
    };

    if (!homeOutletId || !targetOutletId) {
      res.status(400).json({ success: false, error: 'homeOutletId and targetOutletId are required' });
      return;
    }

    const result = await bookSlotAndUnlockDoor({
      userId,
      homeOutletId,
      destinationOutletId: targetOutletId,
      doorId,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Book and access gym error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const getBookingHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ success: true, data: [] });
};

export const debugPageStructure = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' });
};
