// Real Arkkies API Integration Module
// Based on captured network traffic analysis

import axios from 'axios';
import { logger } from '../utils/logger';

export interface RealArkkiesBooking {
  bookingId: string;
  outletId: string;
  doorEntryUrl: string;
  accessCode?: string;
  qrCode?: string;
}

export class RealArkkiesAPI {
  private baseURL = 'https://api.arkkies.com/v2';
  private entryURL = 'https://arkkies.com/entry';
  
  constructor(private sessionCookie: string) {}

  /**
   * Get booking details using real Arkkies API
   */
  async getBookingDetails(bookingId: string): Promise<any> {
    try {
      logger.info(`🔍 Fetching real booking details for: ${bookingId}`);
      
      const response = await axios.get(`${this.baseURL}/brand/outlet/booking/${bookingId}`, {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'cookie': this.sessionCookie,
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'referer': 'https://arkkies.com/',
          'origin': 'https://arkkies.com'
        },
        timeout: 10000
      });

      logger.info(`✅ Real booking API response: ${response.status}`);
      return response.data;
    } catch (error: any) {
      logger.error(`❌ Real booking API failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check user authentication status with Arkkies
   */
  async checkAuthStatus(): Promise<any> {
    try {
      logger.info(`🔐 Checking Arkkies auth status...`);
      
      const response = await axios.get(`${this.baseURL}/auth/provider/public/sessions/whoami`, {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'cookie': this.sessionCookie,
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'referer': 'https://arkkies.com/',
          'origin': 'https://arkkies.com'
        },
        timeout: 10000
      });

      logger.info(`✅ Auth check response: ${response.status}`);
      return response.data;
    } catch (error: any) {
      logger.error(`❌ Auth check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate real door entry URL
   */
  generateDoorEntryUrl(bookingId: string): string {
    const doorUrl = `${this.entryURL}?booking-id=${bookingId}`;
    logger.info(`🚪 Generated door entry URL: ${doorUrl}`);
    return doorUrl;
  }

  /**
   * Complete door access flow using real APIs
   */
  async accessDoor(bookingId: string, outletId: string): Promise<RealArkkiesBooking> {
    try {
      logger.info(`🎯 Starting REAL door access for booking: ${bookingId}`);

      // Step 1: Verify user authentication
      const authStatus = await this.checkAuthStatus();
      logger.info(`👤 User authenticated: ${JSON.stringify(authStatus)}`);

      // Step 2: Get booking details
      const bookingDetails = await this.getBookingDetails(bookingId);
      logger.info(`📋 Booking details: ${JSON.stringify(bookingDetails)}`);

      // Step 3: Generate door entry URL
      const doorEntryUrl = this.generateDoorEntryUrl(bookingId);

      const result: RealArkkiesBooking = {
        bookingId,
        outletId,
        doorEntryUrl,
        accessCode: bookingDetails?.accessCode,
        qrCode: bookingDetails?.qrCode
      };

      logger.info(`🎉 REAL door access prepared successfully!`);
      return result;

    } catch (error: any) {
      logger.error(`💥 Real door access failed: ${error.message}`);
      throw new Error(`Real Arkkies integration failed: ${error.message}`);
    }
  }
}

/**
 * Helper function to create RealArkkiesAPI instance from session
 */
export function createRealArkkiesAPI(sessionCookies: string[]): RealArkkiesAPI | null {
  const arkSession = sessionCookies.find(cookie => cookie.includes('ark_session='));
  
  if (!arkSession) {
    logger.warn('⚠️ No ark_session cookie found');
    return null;
  }

  logger.info('✅ Created RealArkkiesAPI instance with valid session');
  return new RealArkkiesAPI(arkSession);
}