import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Create email transporter
const createTransporter = () => {
  // For development, use Ethereal (fake SMTP)
  if (process.env.NODE_ENV !== 'production') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }

  // Production email service (Gmail, SendGrid, etc.)
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD // Use app password, not regular password
      }
    });
  }

  if (process.env.EMAIL_SERVICE === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  // Generic SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send email utility
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Anyhow Fitness <noreply@anyhowfitness.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[EMAIL] Would send to ${options.to}:`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Text: ${options.text}`);
      console.log('---');
    } else {
      const result = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Sent to ${options.to}: ${result.messageId}`);
    }
  } catch (error) {
    console.error('[EMAIL] Send failed:', error);
    throw new Error('Failed to send email');
  }
};

// Send OTP email for password reset
export const sendOTPEmail = async (email: string, otpCode: string, displayName: string): Promise<void> => {
  const subject = 'Your Anyhow Fitness Verification Code';
  
  const text = `Hi ${displayName},

Your verification code for Anyhow Fitness is: ${otpCode}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Anyhow Fitness Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin: 0;">🏋️ Anyhow Fitness</h1>
      </div>
      
      <div style="background-color: #f9fafb; padding: 30px; border-radius: 10px; text-align: center;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">Verification Code</h2>
        <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">
          Hi ${displayName}, here's your verification code:
        </p>
        
        <div style="background-color: #3b82f6; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 4px; margin: 20px 0;">
          ${otpCode}
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          This code will expire in <strong>10 minutes</strong>
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          If you didn't request this code, please ignore this email.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
          © 2025 Anyhow Fitness. All rights reserved.
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject,
    text,
    html
  });
};

// Send welcome email for new registrations
export const sendWelcomeEmail = async (email: string, displayName: string): Promise<void> => {
  const subject = 'Welcome to Anyhow Fitness! 🎉';
  
  const text = `Hi ${displayName},

Welcome to Anyhow Fitness! We're excited to have you join our fitness community.

You can now:
- Track your workouts and progress
- Connect with friends and share achievements
- Access gym facilities through our app
- Monitor your fitness journey

Get started by logging into the app and creating your first workout!

If you have any questions, feel free to reach out to our support team.

Best regards,
Anyhow Fitness Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin: 0;">🏋️ Anyhow Fitness</h1>
      </div>
      
      <div style="background-color: #f0f9ff; padding: 30px; border-radius: 10px;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome, ${displayName}! 🎉</h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          We're excited to have you join our fitness community! You're now ready to start your fitness journey with us.
        </p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">What you can do now:</h3>
          <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
            <li>📊 Track your workouts and progress</li>
            <li>👥 Connect with friends and share achievements</li>
            <li>🏪 Access gym facilities through our app</li>
            <li>📈 Monitor your fitness journey over time</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #4b5563; margin-bottom: 20px;">Ready to get started?</p>
          <div style="background-color: #3b82f6; color: white; padding: 15px 30px; border-radius: 8px; display: inline-block; font-weight: bold;">
            Open the app and create your first workout!
          </div>
        </div>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #6b7280; font-size: 14px;">
          Need help? Reply to this email and we'll be happy to assist you.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
          © 2025 Anyhow Fitness. All rights reserved.
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject,
    text,
    html
  });
};