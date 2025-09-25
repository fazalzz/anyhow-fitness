// Enhanced Real Arkkies API Integration Module
// Based on comprehensive network traffic analysis

import axios from 'axios';
import { logger } from '../utils/logger';

export interface RealArkkiesBooking {
  bookingId: string;
  outletId: string;
  doorEntryUrl: string;
  accessCode?: string;
  qrCode?: string;
  bookingData?: any;
}

export interface ArkkiesUserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface ArkkiesBookingList {
  bookings: any[];
  active: any[];
  upcoming: any[];
}

export class EnhancedRealArkkiesAPI {
  private baseURL = 'https://api.arkkies.com/v2';
  private entryURL = 'https://arkkies.com/entry';
  private sessionCookie: string;
  private csrfToken: string;
  private stripeIds: {
    mid: string;
    sid: string;
  };

  constructor(sessionData: {
    arkSession: string;
    csrfToken?: string;
    stripeMid?: string;
    stripeSid?: string;
  }) {
    this.sessionCookie = sessionData.arkSession;
    this.csrfToken = sessionData.csrfToken || 'zTKqj6YFugvgYwtG5JDn9F2P+nQq2UvQMkl1fz6ckFQ=';
    this.stripeIds = {
      mid: sessionData.stripeMid || '3ccbdab4-257e-4adf-8b4a-34dddd6de0e8407d3e',
      sid: sessionData.stripeSid || '89f2a8c4-5360-4c5a-bc8d-b70ba0469890f4fbc8'
    };
  }

  private buildHeaders(outletId?: string): Record<string, string> {
    // Comprehensive cookie string based on captured traffic
    const cookies = [
      `__stripe_mid=${this.stripeIds.mid}`,
      `__stripe_sid=${this.stripeIds.sid}`,
      `csrf_token_29636fffd97789094acb1945c1b0399856b0cb54a2ec76716ff75c0cbd72fbad=${this.csrfToken}`,
      this.sessionCookie
    ].join('; ');

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'accept-language': 'en-GB,en;q=0.9,en-US;q=0.8,ar;q=0.7',
      'content-type': 'application/json',
      'cookie': cookies,
      'dnt': '1',
      'origin': 'https://arkkies.com',
      'priority': 'u=1, i',
      'referer': 'https://arkkies.com/',
      'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Microsoft Edge";v="140"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'
    };

    // Add outlet-specific header for gym context
    if (outletId) {
      headers['x-ark-outlet'] = outletId;
    }

    return headers;
  }

  /**
   * Get user profile information
   */
  async getUserProfile(): Promise<ArkkiesUserProfile> {
    try {
      logger.info('👤 Fetching user profile...');
      
      const response = await axios.get(`${this.baseURL}/customer/profile`, {
        headers: this.buildHeaders(),
        timeout: 10000
      });

      logger.info(`✅ Profile fetched: ${response.status}`);
      return response.data;
    } catch (error: any) {
      logger.error(`❌ Profile fetch failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check authentication status with enhanced whoami endpoint
   */
  async checkAuthStatus(): Promise<any> {
    try {
      logger.info('🔐 Checking authentication status...');
      
      const response = await axios.get(`${this.baseURL}/auth/provider/public/sessions/whoami`, {
        headers: this.buildHeaders(),
        timeout: 10000
      });

      logger.info(`✅ Auth status: ${response.status}`);
      return response.data;
    } catch (error: any) {
      logger.error(`❌ Auth check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all user bookings for a specific outlet
   */
  async getUserBookings(outletId: string): Promise<ArkkiesBookingList> {
    try {
      logger.info(`📋 Fetching bookings for outlet: ${outletId}`);
      
      const response = await axios.get(`${this.baseURL}/brand/outlet/booking`, {
        headers: this.buildHeaders(outletId),
        timeout: 10000
      });

      logger.info(`✅ Bookings fetched: ${response.status}`);
      return response.data;
    } catch (error: any) {
      logger.error(`❌ Bookings fetch failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get specific booking details
   */
  async getBookingDetails(bookingId: string): Promise<any> {
    try {
      logger.info(`🔍 Fetching booking details: ${bookingId}`);
      
      const response = await axios.get(`${this.baseURL}/brand/outlet/booking/${bookingId}`, {
        headers: this.buildHeaders(),
        timeout: 10000
      });

      logger.info(`✅ Booking details: ${response.status}`);
      return response.data;
    } catch (error: any) {
      logger.error(`❌ Booking details failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get payment profile information
   */
  async getPaymentProfile(outletId: string): Promise<any> {
    try {
      logger.info('💳 Fetching payment profile...');
      
      const response = await axios.get(`${this.baseURL}/payment/profile`, {
        headers: this.buildHeaders(outletId),
        timeout: 10000
      });

      logger.info(`✅ Payment profile: ${response.status}`);
      return response.data;
    } catch (error: any) {
      logger.error(`❌ Payment profile failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get age verification status
   */
  async getAgeVerification(): Promise<any> {
    try {
      logger.info('🔞 Checking age verification...');
      
      const response = await axios.get(`${this.baseURL}/customer/profile/verify/age`, {
        headers: this.buildHeaders(),
        timeout: 10000
      });

      logger.info(`✅ Age verification: ${response.status}`);
      return response.data;
    } catch (error: any) {
      logger.error(`❌ Age verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate door entry URL
   */
  generateDoorEntryUrl(bookingId: string): string {
    const doorUrl = `${this.entryURL}?booking-id=${bookingId}`;
    logger.info(`🚪 Generated door entry URL: ${doorUrl}`);
    return doorUrl;
  }

  /**
   * Find active booking for outlet (dynamic booking discovery)
   */
  async findActiveBooking(outletId: string): Promise<string | null> {
    try {
      logger.info(`🔍 Searching for active bookings in outlet: ${outletId}`);
      
      const bookings = await this.getUserBookings(outletId);
      
      // Look for active or upcoming bookings
      const activeBooking = bookings.active?.[0] || bookings.upcoming?.[0] || bookings.bookings?.[0];
      
      if (activeBooking?.id || activeBooking?.bookingId) {
        const bookingId = activeBooking.id || activeBooking.bookingId;
        logger.info(`✅ Found active booking: ${bookingId}`);
        return bookingId;
      }

      logger.warn('⚠️ No active bookings found');
      return null;
    } catch (error: any) {
      logger.error(`❌ Active booking search failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Complete enhanced door access flow with dynamic booking discovery
   */
  async accessDoor(outletId: string, bookingId?: string): Promise<RealArkkiesBooking> {
    try {
      logger.info(`🎯 Starting enhanced door access for outlet: ${outletId}`);

      // Step 1: Verify authentication
      const authStatus = await this.checkAuthStatus();
      logger.info(`👤 Authentication verified`);

      // Step 2: Find active booking if not provided
      let targetBookingId = bookingId;
      if (!targetBookingId) {
        const foundBookingId = await this.findActiveBooking(outletId);
        if (!foundBookingId) {
          throw new Error('No active booking found for this outlet');
        }
        targetBookingId = foundBookingId;
      }

      // Step 3: Get booking details
      const bookingDetails = await this.getBookingDetails(targetBookingId);
      logger.info(`📋 Booking details retrieved`);

      // Step 4: Generate door entry URL
      const doorEntryUrl = this.generateDoorEntryUrl(targetBookingId);

      const result: RealArkkiesBooking = {
        bookingId: targetBookingId,
        outletId,
        doorEntryUrl,
        accessCode: bookingDetails?.accessCode,
        qrCode: bookingDetails?.qrCode,
        bookingData: bookingDetails
      };

      logger.info(`🎉 Enhanced door access prepared successfully!`);
      return result;

    } catch (error: any) {
      logger.error(`💥 Enhanced door access failed: ${error.message}`);
      throw new Error(`Enhanced Arkkies integration failed: ${error.message}`);
    }
  }
}

/**
 * Enhanced helper function to create API instance from network traffic data
 */
export function createEnhancedArkkiesAPI(cookies: string[]): EnhancedRealArkkiesAPI | null {
  try {
    // Extract session data from cookies
    const arkSession = cookies.find(c => c.includes('ark_session='));
    const csrfToken = cookies.find(c => c.includes('csrf_token'))?.split('=')[1];
    const stripeMid = cookies.find(c => c.includes('__stripe_mid='))?.split('=')[1];
    const stripeSid = cookies.find(c => c.includes('__stripe_sid='))?.split('=')[1];

    if (!arkSession) {
      logger.warn('⚠️ No ark_session found in cookies');
      return null;
    }

    logger.info('✅ Created enhanced RealArkkiesAPI instance');
    return new EnhancedRealArkkiesAPI({
      arkSession,
      csrfToken,
      stripeMid,
      stripeSid
    });

  } catch (error: any) {
    logger.error(`❌ Failed to create enhanced API: ${error.message}`);
    return null;
  }
}