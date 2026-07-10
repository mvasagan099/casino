import * as kenoController from './keno.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function kenoRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/bet', {
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'picks'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          picks: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 40 }, minItems: 1, maxItems: 10, uniqueItems: true },
        },
        additionalProperties: false,
      },
    },
    handler: kenoController.placeBet,
  });
}
