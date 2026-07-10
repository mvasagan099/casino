import nodemailer from 'nodemailer';

/**
 * Creates a nodemailer transporter.
 * Falls back to Ethereal (fake SMTP) in development if no SMTP config is set.
 */
async function getTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Development fallback — logs email to console
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  return transporter;
}

const FROM = process.env.SMTP_FROM || '"Kings Casino" <no-reply@kingscasino.io>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Send an email verification link to the user.
 */
export async function sendVerificationEmail({ to, username, token }) {
  const transporter = await getTransporter();
  const link = `${FRONTEND_URL}/verify-email?token=${token}`;

  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Verify your email — Kings Casino',
    html: `
      <h2>Welcome, ${username}!</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${link}" style="background:#6c47ff;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Verify Email
      </a>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, ignore this email.</p>
    `,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[mailer] Verification email preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
}

/**
 * Send a password reset link to the user.
 */
export async function sendPasswordResetEmail({ to, username, token }) {
  const transporter = await getTransporter();
  const link = `${FRONTEND_URL}/reset-password?token=${token}`;

  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Reset your password — Kings Casino',
    html: `
      <h2>Password Reset</h2>
      <p>Hi ${username}, you requested a password reset.</p>
      <a href="${link}" style="background:#6c47ff;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Reset Password
      </a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[mailer] Password reset email preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
}
