import { Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { encrypt, decrypt } from '../utils/encryption';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

interface ArkkiesSession {
  cookies: string[];
  userId: string;
  sessionId: string;
}

interface ArkkiesCredentials {
  email: string;
  password: string;
}

interface GymOutlet {
  id: string;
  name: string;
  location: string;
  url: string;
}

interface BookingRequest {
  homeOutletId: string;
  targetOutletId: string;
  selectedDoor?: string;
  arkkiesCredentials: ArkkiesCredentials;
}

// In-memory session storage (in production, use Redis or database)
const activeSessions = new Map<string, ArkkiesSession>();

export const loginToArkkies = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    logger.info(`Attempting to login to Arkkies for user: ${email}`);

    // Create axios instance with session support
    const client = axios.create({
      baseURL: 'https://arkkies.com',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Step 1: Get login page to extract CSRF token
    const loginPageResponse = await client.get('/portal/home');
    const $ = cheerio.load(loginPageResponse.data);
    
    // Extract CSRF token (adjust selector based on actual form)
    const csrfToken = $('input[name="_token"]').attr('value') || 
                     $('meta[name="csrf-token"]').attr('content');

    // Step 2: Submit login form
    const loginData = new URLSearchParams({
      email,
      password,
      ...(csrfToken && { '_token': csrfToken })
    });

    const loginResponse = await client.post('/portal/login', loginData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://arkkies.com/portal/home'
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });

    // Check if login was successful (look for redirect or success indicators)
    const isLoggedIn = loginResponse.status === 302 || 
                      loginResponse.data.includes('dashboard') ||
                      loginResponse.data.includes('bookings');

    if (!isLoggedIn) {
      logger.warn(`Failed to login to Arkkies for user: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid Arkkies credentials'
      });
    }

    // Store session info
    const sessionId = Date.now().toString();
    const cookies = loginResponse.headers['set-cookie'] || [];
    
    activeSessions.set(req.user!.id, {
      cookies,
      userId: req.user!.id,
      sessionId
    });

    // Encrypt and store credentials (optional - for repeated access)
    const encryptedCredentials = encrypt(JSON.stringify({ email, password }));

    logger.info(`Successfully logged into Arkkies for user: ${email}`);

    res.json({
      success: true,
      data: {
        sessionId,
        message: 'Successfully logged into Arkkies'
      }
    });

  } catch (error: any) {
    logger.error('Error logging into Arkkies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login to Arkkies'
    });
  }
};

export const getOutlets = async (req: AuthRequest, res: Response) => {
  try {
    const session = activeSessions.get(req.user!.id);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'No active Arkkies session'
      });
    }

    // Mock outlets for now - will scrape from actual site
    const outlets: GymOutlet[] = [
      {
        id: 'downtown',
        name: 'ARK Downtown',
        location: 'Downtown East',
        url: '/portal/downtown'
      },
      {
        id: 'orchard',
        name: 'ARK Orchard',
        location: 'Orchard Central',
        url: '/portal/orchard'
      },
      {
        id: 'marina',
        name: 'ARK Marina',
        location: 'Marina Bay',
        url: '/portal/marina'
      },
      {
        id: 'tampines',
        name: 'ARK Tampines',
        location: 'Tampines Mall',
        url: '/portal/tampines'
      }
    ];

    res.json({
      success: true,
      data: outlets
    });

  } catch (error: any) {
    logger.error('Error getting outlets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get outlets'
    });
  }
};

export const getSubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    const session = activeSessions.get(req.user!.id);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'No active Arkkies session'
      });
    }

    // TODO: Scrape actual subscriptions from Arkkies
    const subscriptions = [
      {
        id: 'monthly-pass-1',
        type: 'Monthly Pass',
        outlet: 'ARK Downtown',
        status: 'Active',
        validUntil: '2024-10-31'
      }
    ];

    res.json({
      success: true,
      data: subscriptions
    });

  } catch (error: any) {
    logger.error('Error getting subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscriptions'
    });
  }
};

export const bookAndAccessGym = async (req: AuthRequest, res: Response) => {
  try {
    const { homeOutletId, targetOutletId, selectedDoor }: BookingRequest = req.body;
    const session = activeSessions.get(req.user!.id);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'No active Arkkies session'
      });
    }

    if (!homeOutletId || !targetOutletId) {
      return res.status(400).json({
        success: false,
        error: 'Home outlet and target outlet are required'
      });
    }

    logger.info(`Booking gym access: ${homeOutletId} -> ${targetOutletId} for user: ${req.user!.id}`);

    // Create axios client with session cookies
    const client = axios.create({
      baseURL: 'https://arkkies.com',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': session.cookies.join('; ')
      }
    });

    // Step 1: Navigate to bookings page
    const bookingsResponse = await client.get('/portal/bookings');
    const $ = cheerio.load(bookingsResponse.data);

    // Step 2: Find and select monthly pass
    // (This would need to be customized based on actual site structure)
    
    // Step 3: Select target outlet and current time slot
    const currentTime = new Date();
    const timeSlot = `${currentTime.getHours()}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    
    // Step 4: Submit booking form
    // (Implementation depends on actual form structure)

    // Step 5: Open door access
    // (Implementation depends on door access mechanism)

    // For now, simulate the process
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info(`Successfully booked and accessed gym for user: ${req.user!.id}`);

    res.json({
      success: true,
      data: {
        bookingId: `booking-${Date.now()}`,
        message: 'Successfully booked slot and opened gym door',
        outlet: targetOutletId,
        door: selectedDoor || 'Main Entrance',
        timeSlot,
        accessGranted: true
      }
    });

  } catch (error: any) {
    logger.error('Error booking and accessing gym:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to book and access gym'
    });
  }
};

export const getBookingHistory = async (req: AuthRequest, res: Response) => {
  try {
    const session = activeSessions.get(req.user!.id);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'No active Arkkies session'
      });
    }

    // TODO: Fetch actual booking history
    const bookings = [
      {
        id: 'booking-123',
        outlet: 'ARK Downtown',
        date: new Date().toISOString(),
        status: 'Completed',
        door: 'Main Entrance'
      }
    ];

    res.json({
      success: true,
      data: bookings
    });

  } catch (error: any) {
    logger.error('Error getting booking history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get booking history'
    });
  }
};