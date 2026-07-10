import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { env } from '../config/env.js';

/**
 * Fastify plugin that creates an ioredis client
 * and decorates the Fastify instance with `redis`.
 */
function redisPlugin(fastify, opts, done) {
  const redis = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
  });

  redis.on('ready', () => {
    fastify.log.info('✅ Redis connected');
  });

  redis.on('error', (err) => {
    fastify.log.error({ err }, 'Redis error');
  });

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', (instance, next) => {
    redis.quit().then(() => next()).catch(next);
  });

  done();
}

export default fp(redisPlugin, {
  name: 'redis',
  fastify: '>=4.0.0',
});
