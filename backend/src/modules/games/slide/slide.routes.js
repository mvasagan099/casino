import * as slideController from './slide.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function slideRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/bet', {
    schema: {
      body: {
        type: 'object', required: ['amount', 'targetMultiplier'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          targetMultiplier: { type: 'number', minimum: 1.01 },
        },
        additionalProperties: false,
      },
    },
    handler: slideController.placeBet,
  });
}
