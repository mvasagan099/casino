import * as molesController from './moles.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function molesRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/start', {
    schema: {
      body: { type: 'object', required: ['amount', 'numMoles'], properties: { amount: { type: 'number', minimum: 0 }, numMoles: { type: 'integer', minimum: 1, maximum: 6 } }, additionalProperties: false },
    },
    handler: molesController.startGame,
  });
  fastify.post('/pick', {
    schema: {
      body: { type: 'object', required: ['holeIndex'], properties: { holeIndex: { type: 'integer', minimum: 0, maximum: 6 } }, additionalProperties: false },
    },
    handler: molesController.pick,
  });
  fastify.post('/cashout', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: molesController.cashout,
  });
}
