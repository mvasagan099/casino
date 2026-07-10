import * as limboController from './limbo.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function limboRoutes(fastify, opts) {
  // All limbo routes require authentication
  fastify.addHook('preHandler', authenticate);

  fastify.post('/bet', {
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'target'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          target: { type: 'number', minimum: 1.01 },
        },
      },
    },
    handler: limboController.placeBet,
  });
}
