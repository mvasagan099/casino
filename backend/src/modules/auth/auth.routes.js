import * as authController from './auth.controller.js';
import * as authSchema from './auth.schema.js';
import * as authService from './auth.service.js';
import { authenticate } from '../../middlewares/authenticate.js';
import oauthPlugin from '@fastify/oauth2';
import { env } from '../../config/env.js';

/**
 * Auth routes — all prefixed with /api/auth
 */
export default async function authRoutes(fastify) {
  // POST /api/auth/register
  fastify.post('/register', { schema: authSchema.registerSchema, handler: authController.register });

  // POST /api/auth/login
  fastify.post('/login', { schema: authSchema.loginSchema, handler: authController.login });

  // POST /api/auth/refresh
  fastify.post('/refresh', { schema: authSchema.refreshSchema, handler: authController.refresh });

  // POST /api/auth/logout
  fastify.post('/logout', { schema: authSchema.logoutSchema, handler: authController.logout });

  // GET /api/auth/me (protected)
  fastify.get('/me', {
    preHandler: [authenticate],
    schema: authSchema.meSchema,
    handler: authController.me,
  });

  // POST /api/auth/forgot-password
  fastify.post('/forgot-password', {
    schema: authSchema.forgotPasswordSchema,
    handler: authController.forgotPassword,
  });

  // POST /api/auth/reset-password
  fastify.post('/reset-password', {
    schema: authSchema.resetPasswordSchema,
    handler: authController.resetPassword,
  });

  // GET /api/auth/verify-email?token=...
  fastify.get('/verify-email', {
    schema: authSchema.verifyEmailSchema,
    handler: authController.verifyEmail,
  });

  // PUT /api/auth/saved-games
  fastify.put('/saved-games', {
    preHandler: [authenticate],
    schema: authSchema.updateSavedGamesSchema,
    handler: authController.updateSavedGames,
  });

  // PUT /api/auth/profile
  fastify.put('/profile', {
    preHandler: [authenticate],
    schema: authSchema.updateProfileSchema,
    handler: authController.updateProfile,
  });

  // Register Google OAuth2
  fastify.register(oauthPlugin, {
    name: 'googleOAuth2',
    credentials: {
      client: {
        id: env.google.clientId,
        secret: env.google.clientSecret,
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/google/login',
    callbackUri: 'http://localhost:3001/api/auth/google/callback',
    scope: ['profile', 'email'],
  });

  // GET /api/auth/google/callback
  fastify.get('/google/callback', async function (request, reply) {
    try {
      const { token } = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const profileData = await res.json();
      
      const profile = {
        googleId: profileData.id,
        email: profileData.email,
        name: profileData.name,
        avatarUrl: profileData.picture,
      };
      
      const { accessToken, refreshToken } = await authService.googleLogin(fastify, profile);
      
      // Redirect to frontend
      reply.redirect(`${env.corsOrigin}/?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (err) {
      request.log.error({ err }, 'Google OAuth error');
      reply.redirect(`${env.corsOrigin}/?error=oauth_failed`);
    }
  });
}
