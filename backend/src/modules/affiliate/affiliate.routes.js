import { getStats, getHistory } from './affiliate.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

export default async function affiliateRoutes(fastify, opts) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/stats', getStats);
  fastify.get('/history', getHistory);
}
