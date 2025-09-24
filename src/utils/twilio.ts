// Twilio SMS utility - disabled for development
export const sendSms = async (to: string, body: string): Promise<void> => {
  console.log(`[TWILIO DISABLED] Would send SMS to ${to}: ${body}`);
  // SMS functionality is disabled in development
  // To enable, configure proper Twilio credentials in .env file
};