import { env } from '../config/env.js';

/**
 * Pino logger configuration for Fastify.
 * Uses pino-pretty in development for human-readable output.
 */
export const loggerConfig = {
  level: env.isDev ? 'debug' : 'info',
  ...(env.isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
};
