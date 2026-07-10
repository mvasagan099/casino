import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../config/env.js';

/**
 * Fastify plugin that registers JWT support for access and refresh tokens.
 * 
 * Decorates:
 * - fastify.jwt (access tokens)
 * - fastify.refresh (refresh tokens)
 * - request.generateTokens(payload) — generates both access + refresh tokens
 */
async function jwtPlugin(fastify) {
  // Register access token JWT (default namespace)
  await fastify.register(fastifyJwt, {
    secret: env.jwt.secret,
    sign: {
      expiresIn: env.jwt.accessExpiry,
    },
  });

  // Register refresh token JWT (separate namespace)
  await fastify.register(fastifyJwt, {
    secret: env.jwt.refreshSecret,
    namespace: 'refresh',
    sign: {
      expiresIn: env.jwt.refreshExpiry,
    },
  });

  fastify.decorate('jwtRefresh', fastify.jwt.refresh);

  /**
   * Utility to generate both access and refresh tokens.
   */
  fastify.decorateRequest('generateTokens', null);

  fastify.addHook('onRequest', async (request) => {
    request.generateTokens = (payload) => {
      const accessToken = fastify.jwt.sign(payload);
      const refreshToken = fastify.jwtRefresh.sign(payload);
      return { accessToken, refreshToken };
    };
  });
}

export default fp(jwtPlugin, {
  name: 'jwt',
});
