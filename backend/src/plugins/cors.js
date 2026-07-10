import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../config/env.js';

/**
 * CORS configuration plugin.
 */
async function corsPlugin(fastify) {
  await fastify.register(cors, {
    origin: env.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}

export default fp(corsPlugin, {
  name: 'cors',
});
