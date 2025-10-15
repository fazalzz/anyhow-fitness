import nodemailer from 'nodemailer';
import { google } from 'googleapis';

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

// Gmail OAuth2 setup for secure authentication
const GMAIL_USER = process.env.SMTP_USER || 'anyhowfitness@gmail.com';
const GMAIL_PASS = process.env.SMTP_PASS || 'pxjawordgpklonqb';
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const defaultFrom = process.env.EMAIL_FROM || 'anyhowfitness@gmail.com';

// Create OAuth2 client if credentials are available
const oauth2Client = CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN 
  ? new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'https://developers.google.com/oauthplayground')
  : null;

if (oauth2Client && REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
}

// Function to get OAuth2 access token
const getAccessToken = async () => {
  if (!oauth2Client) return null;
  try {
    const { token } = await oauth2Client.getAccessToken();
    return token;
  } catch (error) {
    console.error('Error getting OAuth2 access token:', error);
    return null;
  }
};

// Create transporter with OAuth2 or fallback to app password
const createTransporter = async () => {
  // Direct Gmail service configuration that we know works
  const GMAIL_USER = process.env.SMTP_USER || 'anyhowfitness@gmail.com';
  const GMAIL_PASS = process.env.SMTP_PASS || 'pxjawordgpklonqb';
  
  if (GMAIL_USER && GMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_PASS,
        },
      });
      
      console.log('✅ Gmail SMTP transporter created successfully');
      return transporter;
    } catch (error) {
      console.error('❌ Gmail transporter creation failed:', error.message);
    }
  }
  
  console.warn('⚠️ No valid Gmail credentials found');
  return null;
};

export const sendEmail = async ({ to, subject, text, html }: EmailPayload): Promise<void> => {
  if (!to) {
    throw new Error('Email recipient is required');
  }

  try {
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.warn('[email] No working SMTP configuration found. Email would have been sent to %s: %s', to, subject);
      console.info('[email] Message preview:\n%s', html ?? text);
      throw new Error('Email service not configured or authentication failed');
    }

    const result = await transporter.sendMail({
      from: defaultFrom,
      to,
      subject,
      text,
      html: html ?? `<pre>${text}</pre>`,
    });
    
    console.log('✅ Email sent successfully:', result.messageId);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
};

export const sendTwoFactorCodeEmail = async (to: string, code: string, expiresInMinutes: number): Promise<void> => {
  const subject = 'Your Anyhow Fitness verification code';
  const text = `Your verification code is ${code}. It expires in ${expiresInMinutes} minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2 style="color:#1a202c;">Your verification code</h2>
      <p>Use the code below to finish signing in. This code will expire in ${expiresInMinutes} minutes.</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p style="font-size: 12px; color: #718096;">If you did not request this code you can ignore this message.</p>
    </div>
  `;

  await sendEmail({ to, subject, text, html });
};
