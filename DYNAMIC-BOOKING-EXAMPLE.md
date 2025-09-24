// Updated Real Arkkies API Integration with Dynamic Booking
// This shows how to replace hardcoded booking IDs with real booking creation

import axios from 'axios';
import { logger } from '../utils/logger';

export class RealArkkiesAPI {
  private baseURL = 'https://api.arkkies.com/v2';
  private entryURL = 'https://arkkies.com/entry';
  
  constructor(private sessionCookie: string) {}

  /**
   * CREATE A NEW BOOKING (instead of using hardcoded ID)
   */
  async createBooking(outletId: string, timeSlot: string, date: string): Promise<any> {
    try {
      logger.info(`📅 Creating NEW booking for ${outletId} at ${timeSlot}`);
      
      // This is the API call we need to capture from Arkkies website
      const response = await axios.post(`${this.baseURL}/brand/outlet/booking`, {
        outletId: outletId,
        date: date, // e.g., "2024-01-15"
        timeSlot: timeSlot, // e.g., "14:00"
        duration: 120, // 2 hours
        // Add other required fields based on Arkkies booking form
      }, {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'cookie': this.sessionCookie,
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'referer': 'https://arkkies.com/',
          'origin': 'https://arkkies.com'
        },
        timeout: 15000
      });

      logger.info(`✅ NEW booking created: ${response.data.bookingId}`);
      return response.data; // Returns { bookingId: "new-booking-id", ... }
      
    } catch (error: any) {
      logger.error(`❌ Booking creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET USER'S EXISTING BOOKINGS
   */
  async getMyBookings(): Promise<any[]> {
    try {
      logger.info(`📋 Fetching user's existing bookings...`);
      
      const response = await axios.get(`${this.baseURL}/brand/user/bookings`, {
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

      logger.info(`✅ Found ${response.data.length} existing bookings`);
      return response.data;
      
    } catch (error: any) {
      logger.error(`❌ Failed to get bookings: ${error.message}`);
      throw error;
    }
  }

  /**
   * COMPLETE BOOKING + DOOR ACCESS FLOW (no hardcoded IDs!)
   */
  async bookAndAccess(outletId: string, timeSlot: string): Promise<any> {
    try {
      logger.info(`🎯 Starting COMPLETE booking + door access flow`);

      // Step 1: Try to find existing booking for today
      let bookingId: string | null = null;
      
      try {
        const existingBookings = await this.getMyBookings();
        const todayBooking = existingBookings.find(booking => 
          booking.outletId === outletId && 
          booking.date === new Date().toISOString().split('T')[0] // Today's date
        );
        
        if (todayBooking) {
          bookingId = todayBooking.id;
          logger.info(`🔍 Found existing booking: ${bookingId}`);
        }
      } catch (err) {
        logger.warn(`⚠️ Could not check existing bookings: ${err.message}`);
      }

      // Step 2: Create new booking if none exists
      if (!bookingId) {
        logger.info(`📅 Creating NEW booking...`);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const newBooking = await this.createBooking(outletId, timeSlot, today);
        bookingId = newBooking.bookingId || newBooking.id;
      }

      // Step 3: Get booking details and generate door access
      const bookingDetails = await this.getBookingDetails(bookingId);
      const doorEntryUrl = this.generateDoorEntryUrl(bookingId);

      return {
        bookingId,
        outletId,
        doorEntryUrl,
        bookingDetails,
        accessCode: bookingDetails?.accessCode,
        qrCode: bookingDetails?.qrCode
      };

    } catch (error: any) {
      logger.error(`💥 Complete booking flow failed: ${error.message}`);
      throw error;
    }
  }

  // ... (keep existing methods like getBookingDetails, checkAuthStatus, etc.)
}

// EXAMPLE USAGE IN CONTROLLER:
/*
// BEFORE (hardcoded):
const realBookingId = '241120a4-deda-4838-a20f-1d558303dd30';
const realBooking = await realAPI.accessDoor(realBookingId, targetOutletId);

// AFTER (dynamic):
const realBooking = await realAPI.bookAndAccess(targetOutletId, selectedTimeSlot);
*/