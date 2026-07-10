import * as diceController from './dice.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function diceRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/games/dice/bet
  fastify.post('/bet', {
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'target', 'direction'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          target: { type: 'number', minimum: 1, maximum: 98 },
          direction: { type: 'string', enum: ['over', 'under'] },
        },
        additionalProperties: false,
      },
    },
    handler: diceController.placeBet,
  });
}
