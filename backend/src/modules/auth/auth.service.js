import crypto from 'crypto';
import { hashPassword, verifyPassword } from '../../utils/hash.js';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../utils/errors.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './auth.mailer.js';

/**
 * Auth service — handles business logic for authentication.
 */

/**
 * Register a new user. Also creates Wallet and initial Provably Fair seed.
 */
export async function registerUser(fastify, { email, username, password, phoneNumber, countryCode, referralCode }) {
  const existing = await fastify.prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    if (existing.email === email) throw new ConflictError('Email already registered');
    throw new ConflictError('Username already taken');
  }

  const passwordHash = await hashPassword(password);
  const emailVerifyToken = crypto.randomBytes(32).toString('hex');

  let referredById = null;
  if (referralCode) {
    const referrer = await fastify.prisma.user.findFirst({ where: { affiliateCode: referralCode } });
    if (referrer) {
      referredById = referrer.id;
    }
  }

  // Create user + wallet + provably fair seed in one transaction
  const user = await fastify.prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { email, username, passwordHash, emailVerifyToken, phoneNumber, countryCode, referredById },
      select: { id: true, email: true, username: true, role: true, savedGames: true, phoneNumber: true, countryCode: true, affiliateCode: true },
    });

    // Auto-create wallet
    await tx.wallet.create({ data: { userId: newUser.id } });
    
    // Auto-create Affiliate profile
    await tx.affiliate.create({ data: { userId: newUser.id } });

    // Auto-generate initial Provably Fair seed pair
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const clientSeed = crypto.randomBytes(16).toString('hex');

    await tx.provablyFairSeed.create({
      data: { userId: newUser.id, serverSeed, serverHash, clientSeed, nonce: 0, isActive: true },
    });

    return newUser;
  });

  // Send verification email (non-blocking)
  sendVerificationEmail({ to: email, username, token: emailVerifyToken }).catch((err) =>
    fastify.log.warn({ err }, 'Failed to send verification email')
  );

  return user;
}

/**
 * Login a user with email/username + password.
 */
export async function loginUser(fastify, { login, password, userAgent, ipAddress }) {
  const user = await fastify.prisma.user.findFirst({
    where: { OR: [{ email: login }, { username: login }] },
  });

  if (!user) throw new UnauthorizedError('Invalid credentials');

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Invalid credentials');

  const tokenPayload = { id: user.id, email: user.email, username: user.username, role: user.role };
  const accessToken = fastify.jwt.sign(tokenPayload);
  const refreshToken = fastify.jwtRefresh.sign(tokenPayload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await fastify.prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
    },
  });

  return {
    user: { id: user.id, email: user.email, username: user.username, role: user.role, savedGames: user.savedGames, phoneNumber: user.phoneNumber, countryCode: user.countryCode },
    accessToken,
    refreshToken,
  };
}

/**
 * Login or register via Google OAuth.
 */
export async function googleLogin(fastify, profile) {
  let user = await fastify.prisma.user.findFirst({
    where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
  });

  if (!user) {
    // Generate a unique username
    let baseUsername = (profile.name || profile.email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    let username = baseUsername;
    let usernameExists = true;
    let counter = 1;
    while (usernameExists) {
      const existing = await fastify.prisma.user.findUnique({ where: { username } });
      if (!existing) {
        usernameExists = false;
      } else {
        username = `${baseUsername}${counter}`;
        counter++;
      }
    }

    user = await fastify.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: profile.email,
          username,
          googleId: profile.googleId,
          avatarUrl: profile.avatarUrl,
          isVerified: true, // Google accounts are implicitly verified
        },
        select: { id: true, email: true, username: true, role: true, savedGames: true, phoneNumber: true, countryCode: true },
      });

      await tx.wallet.create({ data: { userId: newUser.id } });

      const serverSeed = crypto.randomBytes(32).toString('hex');
      const serverHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
      const clientSeed = crypto.randomBytes(16).toString('hex');

      await tx.provablyFairSeed.create({
        data: { userId: newUser.id, serverSeed, serverHash, clientSeed, nonce: 0, isActive: true },
      });

      return newUser;
    });
  } else if (!user.googleId) {
    // Link existing account
    user = await fastify.prisma.user.update({
      where: { id: user.id },
      data: { googleId: profile.googleId, isVerified: true },
      select: { id: true, email: true, username: true, role: true, savedGames: true, phoneNumber: true, countryCode: true },
    });
  }

  const tokenPayload = { id: user.id, email: user.email, username: user.username, role: user.role };
  const accessToken = fastify.jwt.sign(tokenPayload);
  const refreshToken = fastify.jwtRefresh.sign(tokenPayload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await fastify.prisma.session.create({
    data: { userId: user.id, refreshToken, expiresAt },
  });

  return { user, accessToken, refreshToken };
}

/**
 * Refresh access token using a valid refresh token.
 */
export async function refreshTokens(fastify, { refreshToken }) {
  try {
    fastify.jwtRefresh.verify(refreshToken);
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const session = await fastify.prisma.session.findUnique({
    where: { refreshToken },
    include: { user: true },
  });

  if (!session) throw new UnauthorizedError('Session not found. Please login again.');
  if (session.expiresAt < new Date()) {
    await fastify.prisma.session.delete({ where: { id: session.id } });
    throw new UnauthorizedError('Session expired. Please login again.');
  }

  const tokenPayload = {
    id: session.user.id,
    email: session.user.email,
    username: session.user.username,
    role: session.user.role,
  };

  const newAccessToken = fastify.jwt.sign(tokenPayload);
  const newRefreshToken = fastify.jwtRefresh.sign(tokenPayload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await fastify.prisma.session.update({
    where: { id: session.id },
    data: { refreshToken: newRefreshToken, expiresAt },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Logout — invalidate a session by deleting it.
 */
export async function logoutUser(fastify, { refreshToken }) {
  const session = await fastify.prisma.session.findUnique({ where: { refreshToken } });
  if (session) await fastify.prisma.session.delete({ where: { id: session.id } });
  return { message: 'Logged out successfully' };
}

/**
 * Get the current user's profile.
 */
export async function getCurrentUser(fastify, userId) {
  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isVerified: true,
      avatarUrl: true,
      createdAt: true,
      savedGames: true,
      phoneNumber: true,
      countryCode: true,
    },
  });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

/**
 * Send a forgot-password email with a reset token.
 */
export async function forgotPassword(fastify, { email }) {
  const user = await fastify.prisma.user.findUnique({ where: { email } });

  // Don't reveal whether email exists
  if (!user) return { message: 'If that email exists, a reset link has been sent.' };

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await fastify.prisma.user.update({
    where: { id: user.id },
    data: { resetPasswordToken: token, resetPasswordExpires: expires },
  });

  sendPasswordResetEmail({ to: email, username: user.username, token }).catch((err) =>
    fastify.log.warn({ err }, 'Failed to send password reset email')
  );

  return { message: 'If that email exists, a reset link has been sent.' };
}

/**
 * Reset password using the token from the email.
 */
export async function resetPassword(fastify, { token, newPassword }) {
  const user = await fastify.prisma.user.findFirst({
    where: { resetPasswordToken: token, resetPasswordExpires: { gt: new Date() } },
  });

  if (!user) throw new BadRequestError('Invalid or expired reset token');

  const passwordHash = await hashPassword(newPassword);

  await fastify.prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
  });

  // Invalidate all sessions for security
  await fastify.prisma.session.deleteMany({ where: { userId: user.id } });

  return { message: 'Password reset successfully. Please login.' };
}

/**
 * Verify email using the token from the verification email.
 */
export async function verifyEmail(fastify, { token }) {
  const user = await fastify.prisma.user.findFirst({
    where: { emailVerifyToken: token },
  });

  if (!user) throw new BadRequestError('Invalid or expired verification token');
  if (user.isVerified) return { message: 'Email already verified' };

  await fastify.prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, emailVerifyToken: null },
  });

  return { message: 'Email verified successfully' };
}

/**
 * Update the user's saved games array.
 */
export async function updateSavedGames(fastify, userId, { savedGames }) {
  const user = await fastify.prisma.user.update({
    where: { id: userId },
    data: { savedGames },
    select: { savedGames: true },
  });
  return user;
}

/**
 * Update the user's profile (phone number).
 */
export async function updateProfile(fastify, userId, { phoneNumber, countryCode }) {
  const user = await fastify.prisma.user.update({
    where: { id: userId },
    data: { phoneNumber, countryCode },
    select: { phoneNumber: true, countryCode: true },
  });
  return user;
}
