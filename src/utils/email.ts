import nodemailer from 'nodemailer';

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE === 'true';
const defaultFrom = process.env.EMAIL_FROM || 'no-reply@anyhow-fitness.com';

const emailEnabled = Boolean(smtpHost && smtpUser && smtpPass);

const transporter = emailEnabled
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

export const sendEmail = async ({ to, subject, text, html }: EmailPayload): Promise<void> => {
  if (!to) {
    throw new Error('Email recipient is required');
  }

  if (!emailEnabled || !transporter) {
    console.warn('[email] SMTP not configured. Email would have been sent to %s: %s', to, subject);
    console.info('[email] Message preview:\n%s', html ?? text);
    return;
  }

  await transporter.sendMail({
    from: defaultFrom,
    to,
    subject,
    text,
    html: html ?? `<pre>${text}</pre>`,
  });
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
