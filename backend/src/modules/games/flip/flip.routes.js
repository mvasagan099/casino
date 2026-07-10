import * as flipController from './flip.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function flipRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/bet', {
    schema: {
      body: {
        type: 'object', required: ['amount', 'prediction', 'numCoins'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          numCoins: { type: 'integer', minimum: 1, maximum: 5 },
          prediction: { type: 'array', items: { type: 'string', enum: ['heads', 'tails'] }, minItems: 1, maxItems: 5 },
        },
        additionalProperties: false,
      },
    },
    handler: flipController.placeBet,
  });
}
