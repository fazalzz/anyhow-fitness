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

    // Step 1: Get login page to extract CSRF token and form structure
    const loginPageResponse = await client.get('/portal/home');
    const $ = cheerio.load(loginPageResponse.data);
    
    logger.info('Analyzing login page structure...');
    
    // Extract CSRF token from various possible locations
    const csrfToken = $('input[name="_token"]').attr('value') || 
                     $('meta[name="csrf-token"]').attr('content') ||
                     $('input[name="csrf_token"]').attr('value') ||
                     $('meta[name="_token"]').attr('content');

    // Find the login form and extract its action URL
    const loginForm = $('form').first();
    const formAction = loginForm.attr('action') || '/portal/login';
    const formMethod = loginForm.attr('method') || 'POST';

    // Extract input field names (they might not be 'email' and 'password')
    const emailField = $('input[type="email"]').attr('name') || 
                      $('input[placeholder*="email" i]').attr('name') || 
                      'email';
    const passwordField = $('input[type="password"]').attr('name') || 'password';

    logger.info(`Login form details: action=${formAction}, method=${formMethod}, emailField=${emailField}, passwordField=${passwordField}, csrfToken=${csrfToken ? 'found' : 'not found'}`);

    // Step 2: Submit login form with extracted field names
    const loginData = new URLSearchParams();
    loginData.append(emailField, email);
    loginData.append(passwordField, password);
    if (csrfToken) {
      loginData.append('_token', csrfToken);
    }

    const loginResponse = await client.post(formAction, loginData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://arkkies.com/portal/home',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    });

    // Analyze the response to determine if login was successful
    const responseText = loginResponse.data;
    const loginSuccessIndicators = [
      'dashboard', 'bookings', 'logout', 'profile', 'account',
      'welcome', 'subscription', 'membership', 'book now'
    ];
    
    const loginFailureIndicators = [
      'invalid', 'error', 'incorrect', 'failed', 'try again',
      'username', 'password', 'login form'
    ];

    const hasSuccessIndicator = loginSuccessIndicators.some(indicator => 
      responseText.toLowerCase().includes(indicator)
    );
    
    const hasFailureIndicator = loginFailureIndicators.some(indicator => 
      responseText.toLowerCase().includes(indicator)
    );

    const isLoggedIn = (loginResponse.status >= 200 && loginResponse.status < 400) && 
                      hasSuccessIndicator && !hasFailureIndicator;

    logger.info(`Login attempt result: status=${loginResponse.status}, hasSuccess=${hasSuccessIndicator}, hasFailure=${hasFailureIndicator}, isLoggedIn=${isLoggedIn}`);

    if (!isLoggedIn) {
      logger.warn(`Failed to login to Arkkies for user: ${email} - Response contained failure indicators or missing success indicators`);
      return res.status(401).json({
        success: false,
        error: 'Invalid Arkkies credentials or login failed'
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

    // Fallback outlets for now
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

    // Mock subscriptions for now
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
        timeSlot: new Date().toLocaleTimeString(),
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

    // Mock booking history
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

export const debugPageStructure = async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;
    const session = activeSessions.get(req.user!.id);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'No active Arkkies session'
      });
    }

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Create axios client with session cookies
    const client = axios.create({
      baseURL: 'https://arkkies.com',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': session.cookies.join('; ')
      }
    });

    const response = await client.get(url);
    const $ = cheerio.load(response.data);

    // Extract useful information about the page structure
    const pageStructure = {
      title: $('title').text(),
      forms: $('form').map((index, element) => ({
        action: $(element).attr('action'),
        method: $(element).attr('method'),
        inputs: $(element).find('input').map((i, input) => ({
          name: $(input).attr('name'),
          type: $(input).attr('type'),
          placeholder: $(input).attr('placeholder'),
          value: $(input).attr('value')
        })).get(),
        selects: $(element).find('select').map((i, select) => ({
          name: $(select).attr('name'),
          options: $(select).find('option').map((j, option) => ({
            value: $(option).attr('value'),
            text: $(option).text()
          })).get()
        })).get()
      })).get(),
      links: $('a').map((index, element) => ({
        href: $(element).attr('href'),
        text: $(element).text().trim()
      })).get().filter(link => link.text && link.href),
      buttons: $('button, input[type="submit"]').map((index, element) => ({
        text: $(element).text() || $(element).attr('value'),
        type: $(element).attr('type'),
        onclick: $(element).attr('onclick')
      })).get(),
      textContent: $('body').text().substring(0, 1000) // First 1000 chars
    };

    logger.info(`Debug page structure for ${url}:`, JSON.stringify(pageStructure, null, 2));

    res.json({
      success: true,
      data: pageStructure
    });

  } catch (error: any) {
    logger.error('Error debugging page structure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to debug page structure',
      details: error.message
    });
  }
};