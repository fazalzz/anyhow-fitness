// Complete Arkkies Booking & Door Unlock Automation
// Handles the full workflow: Booking Creation → Door Unlock in one action

import axios from 'axios';
import { logger } from '../utils/logger';

export interface ArkkiesBookingFlow {
  homeOutletId: string;
  destinationOutletId: string;
  bookingId?: string;
  doorEntryUrl?: string;
  success: boolean;
  message: string;
  steps: BookingStep[];
}

export interface BookingStep {
  step: number;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export class ArkkiesBookingAutomation {
  private baseURL = 'https://api.arkkies.com/v2';
  private portalURL = 'https://arkkies.com/portal';
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

    if (outletId) {
      headers['x-ark-outlet'] = outletId;
    }

    return headers;
  }

  /**
   * Get current time slot (next available slot after current time)
   */
  private getCurrentTimeSlot(): string {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Find next available 30-minute slot
    let nextSlotHour = currentHour;
    let nextSlotMinute = currentMinute < 30 ? 30 : 0;
    
    if (nextSlotMinute === 0) {
      nextSlotHour += 1;
    }
    
    // Format as HH:MM
    return `${nextSlotHour.toString().padStart(2, '0')}:${nextSlotMinute.toString().padStart(2, '0')}`;
  }

  /**
   * Get today's date in Arkkies format
   */
  private getTodaysDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Step 1: Get user's monthly season pass details
   */
  async getMonthlySeasonPass(homeOutletId: string): Promise<any> {
    try {
      logger.info(`📋 Getting monthly season pass for outlet: ${homeOutletId}`);
      
      const response = await axios.get(`${this.baseURL}/customer/passes/active`, {
        headers: this.buildHeaders(homeOutletId),
        timeout: 10000
      });

      const passes = response.data;
      const monthlyPass = passes.find((pass: any) => 
        pass.type?.toLowerCase().includes('monthly') || 
        pass.name?.toLowerCase().includes('monthly') ||
        pass.title?.toLowerCase().includes('season')
      );

      if (!monthlyPass) {
        throw new Error('No monthly season pass found');
      }

      logger.info(`✅ Found monthly pass: ${monthlyPass.name || monthlyPass.title}`);
      return monthlyPass;

    } catch (error: any) {
      logger.error(`❌ Failed to get monthly pass: ${error.message}`);
      throw error;
    }
  }

  /**
   * Step 2: Get available time slots for destination outlet
   */
  async getAvailableTimeSlots(destinationOutletId: string, date: string): Promise<any[]> {
    try {
      logger.info(`🕐 Getting available time slots for ${destinationOutletId} on ${date}`);
      
      const response = await axios.get(`${this.baseURL}/brand/outlet/${destinationOutletId}/availability`, {
        headers: this.buildHeaders(destinationOutletId),
        params: { date },
        timeout: 10000
      });

      logger.info(`✅ Found ${response.data.length} available slots`);
      return response.data;

    } catch (error: any) {
      logger.error(`❌ Failed to get time slots: ${error.message}`);
      throw error;
    }
  }

  /**
   * Step 3: Create booking with monthly pass
   */
  async createBooking(params: {
    homeOutletId: string;
    destinationOutletId: string;
    passId: string;
    date: string;
    timeSlot: string;
  }): Promise<any> {
    try {
      logger.info(`📅 Creating booking: ${params.homeOutletId} → ${params.destinationOutletId} at ${params.timeSlot}`);
      
      const bookingData = {
        homeOutletId: params.homeOutletId,
        destinationOutletId: params.destinationOutletId,
        passId: params.passId,
        date: params.date,
        timeSlot: params.timeSlot,
        entryType: 'remote', // For remote door unlock
        doorType: 'main' // Main entrance
      };

      const response = await axios.post(`${this.baseURL}/brand/outlet/booking`, bookingData, {
        headers: this.buildHeaders(params.destinationOutletId),
        timeout: 15000
      });

      logger.info(`✅ Booking created successfully: ${response.data.bookingId}`);
      return response.data;

    } catch (error: any) {
      logger.error(`❌ Booking creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Step 4: Activate remote entry for the booking
   */
  async activateRemoteEntry(bookingId: string, outletId: string): Promise<string> {
    try {
      logger.info(`🚪 Activating remote entry for booking: ${bookingId}`);
      
      const response = await axios.post(`${this.baseURL}/brand/outlet/booking/${bookingId}/remote-entry`, {
        doorType: 'main',
        action: 'unlock'
      }, {
        headers: this.buildHeaders(outletId),
        timeout: 10000
      });

      const doorEntryUrl = `https://arkkies.com/entry?booking-id=${bookingId}`;
      logger.info(`🔓 Remote entry activated: ${doorEntryUrl}`);
      
      return doorEntryUrl;

    } catch (error: any) {
      logger.error(`❌ Remote entry activation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * COMPLETE AUTOMATION: Book + Unlock Door in one action
   */
  async bookAndUnlockDoor(homeOutletId: string, destinationOutletId: string): Promise<ArkkiesBookingFlow> {
    const steps: BookingStep[] = [
      { step: 1, title: 'Getting Monthly Season Pass', status: 'pending' },
      { step: 2, title: 'Checking Available Time Slots', status: 'pending' },
      { step: 3, title: 'Creating Booking (Auto Date/Time)', status: 'pending' },
      { step: 4, title: 'Activating Remote Entry', status: 'pending' },
      { step: 5, title: 'Generating Door Unlock URL', status: 'pending' }
    ];

    const result: ArkkiesBookingFlow = {
      homeOutletId,
      destinationOutletId,
      success: false,
      message: '',
      steps
    };

    try {
      // Step 1: Get Monthly Season Pass
      steps[0].status = 'processing';
      const monthlyPass = await this.getMonthlySeasonPass(homeOutletId);
      steps[0].status = 'completed';
      steps[0].message = `Found: ${monthlyPass.name || 'Monthly Pass'}`;

      // Step 2: Get Available Time Slots
      steps[1].status = 'processing';
      const todaysDate = this.getTodaysDate();
      const availableSlots = await this.getAvailableTimeSlots(destinationOutletId, todaysDate);
      steps[1].status = 'completed';
      steps[1].message = `${availableSlots.length} slots available`;

      // Step 3: Create Booking (Auto current time)
      steps[2].status = 'processing';
      const currentTimeSlot = this.getCurrentTimeSlot();
      
      // Find best available slot near current time
      const bestSlot = availableSlots.find(slot => slot.time >= currentTimeSlot) || availableSlots[0];
      
      if (!bestSlot) {
        throw new Error('No available time slots for today');
      }

      const booking = await this.createBooking({
        homeOutletId,
        destinationOutletId,
        passId: monthlyPass.id,
        date: todaysDate,
        timeSlot: bestSlot.time
      });
      
      steps[2].status = 'completed';
      steps[2].message = `Booked for ${bestSlot.time}`;
      result.bookingId = booking.bookingId;

      // Step 4: Activate Remote Entry
      steps[3].status = 'processing';
      const doorEntryUrl = await this.activateRemoteEntry(booking.bookingId, destinationOutletId);
      steps[3].status = 'completed';
      steps[3].message = 'Remote entry ready';

      // Step 5: Generate Final Door URL
      steps[4].status = 'processing';
      result.doorEntryUrl = doorEntryUrl;
      steps[4].status = 'completed';
      steps[4].message = 'Door unlock URL generated';

      result.success = true;
      result.message = `🎉 Booking complete! Door ready to unlock at ${destinationOutletId}`;

      logger.info(`🚀 COMPLETE SUCCESS: ${homeOutletId} → ${destinationOutletId} | Booking: ${result.bookingId}`);

    } catch (error: any) {
      // Mark current step as failed
      const currentStep = steps.find(s => s.status === 'processing');
      if (currentStep) {
        currentStep.status = 'failed';
        currentStep.message = error.message;
      }

      result.success = false;
      result.message = `❌ Booking failed: ${error.message}`;
      logger.error(`💥 Booking automation failed: ${error.message}`);
    }

    return result;
  }
}

/**
 * Create booking automation instance from session data
 */
export function createBookingAutomation(cookies: string[]): ArkkiesBookingAutomation | null {
  try {
    const arkSession = cookies.find(c => c.includes('ark_session='));
    const csrfToken = cookies.find(c => c.includes('csrf_token'))?.split('=')[1];
    const stripeMid = cookies.find(c => c.includes('__stripe_mid='))?.split('=')[1];
    const stripeSid = cookies.find(c => c.includes('__stripe_sid='))?.split('=')[1];

    if (!arkSession) {
      logger.warn('⚠️ No ark_session found for booking automation');
      return null;
    }

    logger.info('🚀 Created booking automation instance');
    return new ArkkiesBookingAutomation({
      arkSession,
      csrfToken,
      stripeMid,
      stripeSid
    });

  } catch (error: any) {
    logger.error(`❌ Failed to create booking automation: ${error.message}`);
    return null;
  }
}