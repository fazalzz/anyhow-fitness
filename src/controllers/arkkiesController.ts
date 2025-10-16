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

    console.log(`🏃‍♂️ Booking request - User: ${userId}, Home: ${homeOutletId}, Target: ${targetOutletId}, Door: ${doorId}`);

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

    const rawMessage = (error as Error)?.message;
    const errorMessage = typeof rawMessage === 'string' ? rawMessage : '';

    if (errorMessage === 'Arkkies credentials not configured for this user') {
      res.status(400).json({ 
        success: false, 
        error: 'Please connect to Arkkies first using the login form above.',
        requiresArkkiesLogin: true
      });
      return;
    }
    
    if (errorMessage.includes('No active Arkkies passes or subscriptions found for this account')) {
      res.status(400).json({ 
        success: false, 
        error: 'No active gym membership found. Please ensure you have an active Arkkies pass or subscription before booking.',
        requiresActiveMembership: true
      });
      return;
    }
    
    if (errorMessage === 'No available booking slots were found for the selected outlet') {
      res.status(409).json({
        success: false,
        error: 'No available slots were found for that outlet. Please pick another time or outlet.',
        noSlots: true,
      });
      return;
    }

    if (errorMessage === 'Unable to determine Arkkies login flow or CSRF token') {
      res.status(502).json({
        success: false,
        error: 'Unable to complete the Arkkies login flow. Please try reconnecting your Arkkies account.',
        requiresArkkiesLogin: true,
      });
      return;
    }

    const parseArkkiesPayload = (rawBody: string): string => {
      if (!rawBody) {
        return '';
      }

      let parsedBody: unknown = null;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        // raw body not JSON, fall back to plain text
      }

      if (parsedBody && typeof parsedBody === 'object') {
        const typed = parsedBody as Record<string, unknown>;
        const candidates = [
          typed.message,
          typed.error,
          typed.detail,
          Array.isArray(typed.errors) ? typed.errors.find((entry) => typeof entry === 'string') : undefined,
        ];
        const firstMatch = candidates.find((value) => typeof value === 'string');
        if (typeof firstMatch === 'string') {
          return firstMatch;
        }
      }

      return rawBody;
    };

    const upstreamPatterns = [
      /Arkkies API request failed \((\d{3})\):(.*)$/s,
      /Failed to initiate Arkkies login flow \((\d{3})\):(.*)$/s,
    ];

    for (const pattern of upstreamPatterns) {
      const match = pattern.exec(errorMessage);
      if (!match) {
        continue;
      }

      const upstreamStatus = Number.parseInt(match[1], 10);
      const rawBody = match[2]?.trim() ?? '';
      const derivedMessage = parseArkkiesPayload(rawBody) || `Arkkies responded with status ${upstreamStatus}.`;

      if (upstreamStatus === 401 || upstreamStatus === 403) {
        res.status(401).json({
          success: false,
          error: 'Your Arkkies session has expired. Please reconnect your Arkkies account and try again.',
          requiresArkkiesLogin: true,
          arkkiesStatus: upstreamStatus,
        });
        return;
      }

      if (upstreamStatus === 404) {
        res.status(409).json({
          success: false,
          error: derivedMessage || 'Requested resource was not found in Arkkies. Please recheck your outlet selection.',
          arkkiesStatus: upstreamStatus,
        });
        return;
      }

      if (upstreamStatus === 409 || upstreamStatus === 422) {
        res.status(409).json({
          success: false,
          error: derivedMessage,
          arkkiesStatus: upstreamStatus,
        });
        return;
      }

      if (upstreamStatus >= 500) {
        res.status(502).json({
          success: false,
          error: 'Arkkies service is temporarily unavailable. Please try again shortly.',
          arkkiesStatus: upstreamStatus,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: derivedMessage,
        arkkiesStatus: upstreamStatus,
      });
      return;
    }

    const fallbackMessage = errorMessage || 'Unexpected error while contacting Arkkies. Please try again.';
    res.status(500).json({ success: false, error: fallbackMessage });
  }
};

export const getBookingHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ success: true, data: [] });
};

export const debugPageStructure = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' });
};
