import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { loggerConfig } from './utils/logger.js';
import { AppError } from './utils/errors.js';

// Plugins
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import jwtPlugin from './plugins/jwt.js';
import corsPlugin from './plugins/cors.js';
import socketPlugin from './plugins/socket.js';

// Route modules
import authRoutes from './modules/auth/auth.routes.js';
import walletRoutes from './modules/wallet/wallet.routes.js';
import provablyFairRoutes from './modules/provably-fair/provably-fair.routes.js';
import diceRoutes from './modules/games/dice/dice.routes.js';
import limboRoutes from './modules/games/limbo/limbo.routes.js';
import minesRoutes from './modules/games/mines/mines.routes.js';
import crashRoutes from './modules/games/crash/crash.routes.js';
import plinkoRoutes from './modules/games/plinko/plinko.routes.js';
import kenoRoutes from './modules/games/keno/keno.routes.js';
import wheelRoutes from './modules/games/wheel/wheel.routes.js';
import hiloRoutes from './modules/games/hilo/hilo.routes.js';
import barsRoutes from './modules/games/bars/bars.routes.js';
import drillRoutes from './modules/games/drill/drill.routes.js';
import dartsRoutes from './modules/games/darts/darts.routes.js';
import diamondsRoutes from './modules/games/diamonds/diamonds.routes.js';
import flipRoutes from './modules/games/flip/flip.routes.js';
import primediceRoutes from './modules/games/primedice/primedice.routes.js';
import slideRoutes from './modules/games/slide/slide.routes.js';
import molesRoutes from './modules/games/moles/moles.routes.js';
import pumpRoutes from './modules/games/pump/pump.routes.js';
import chickenRoutes from './modules/games/chicken/chicken.routes.js';
import rpsRoutes from './modules/games/rps/rps.routes.js';
import blackjackRoutes from './modules/games/blackjack/blackjack.routes.js';
import historyRoutes from './modules/games/history.routes.js';
import affiliateRoutes from './modules/affiliate/affiliate.routes.js';

// Admin routes
import adminRoutes from './modules/admin/admin.routes.js';

/**
 * Create and configure the Fastify application.
 * @param {object} opts - Fastify options override
 * @returns {import('fastify').FastifyInstance}
 */
export async function buildApp(opts = {}) {
  const app = Fastify({
    logger: loggerConfig,
    ...opts,
  });

  // ─── Global Error Handler ──────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    const response = {
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      },
    };

    // Log the error
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Server error');
    } else {
      request.log.warn({ err: error }, 'Client error');
    }

    // Handle Fastify validation errors
    if (error.validation) {
      response.error.code = 'VALIDATION_ERROR';
      response.error.message = 'Validation failed';
      response.error.details = error.validation.map((v) => ({
        field: v.instancePath?.replace('/', '') || v.params?.missingProperty || 'unknown',
        message: v.message,
      }));
      return reply.status(400).send(response);
    }

    // Don't leak internal errors in production
    if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
      response.error.message = 'Internal server error';
    }

    reply.status(statusCode).send(response);
  });

  // ─── Not Found Handler ─────────────────────────────────────
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });

  // ─── Register Plugins ─────────────────────────────────────────
  // Security headers
  await app.register(helmet, { contentSecurityPolicy: false });
  // Rate limiting: 300 req/min per IP
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please slow down.' },
    }),
  });
  await app.register(corsPlugin);
  await app.register(jwtPlugin);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(socketPlugin);

  // ─── Health Check ──────────────────────────────────────────
  app.get('/api/health', async (request, reply) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    // Check database connection
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      health.database = 'connected';
    } catch {
      health.database = 'disconnected';
      health.status = 'degraded';
    }

    // Check Redis connection
    try {
      await app.redis.ping();
      health.redis = 'connected';
    } catch {
      health.redis = 'disconnected';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    reply.status(statusCode).send(health);
  });

  // ─── Register Routes ──────────────────────────────────────
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(walletRoutes, { prefix: '/api/wallet' });
  await app.register(provablyFairRoutes, { prefix: '/api/provably-fair' });
  await app.register(diceRoutes, { prefix: '/api/games/dice' });
  await app.register(limboRoutes, { prefix: '/api/games/limbo' });
  await app.register(minesRoutes, { prefix: '/api/games/mines' });
  await app.register(crashRoutes, { prefix: '/api/games/crash' });
  await app.register(plinkoRoutes, { prefix: '/api/games/plinko' });
  await app.register(kenoRoutes, { prefix: '/api/games/keno' });
  await app.register(wheelRoutes, { prefix: '/api/games/wheel' });
  await app.register(affiliateRoutes, { prefix: '/api/affiliate' });
  await app.register(hiloRoutes, { prefix: '/api/games/hilo' });
  await app.register(barsRoutes, { prefix: '/api/games/bars' });
  await app.register(drillRoutes, { prefix: '/api/games/drill' });
  await app.register(dartsRoutes, { prefix: '/api/games/darts' });
  await app.register(diamondsRoutes, { prefix: '/api/games/diamonds' });
  await app.register(flipRoutes, { prefix: '/api/games/flip' });
  await app.register(primediceRoutes, { prefix: '/api/games/primedice' });
  await app.register(slideRoutes, { prefix: '/api/games/slide' });
  await app.register(molesRoutes, { prefix: '/api/games/moles' });
  await app.register(pumpRoutes, { prefix: '/api/games/pump' });
  await app.register(chickenRoutes, { prefix: '/api/games/chicken' });
  await app.register(rpsRoutes, { prefix: '/api/games/rps' });
  await app.register(blackjackRoutes, { prefix: '/api/games/blackjack' });
  await app.register(historyRoutes, { prefix: '/api/games' });
  
  // Admin Routes
  await app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}
