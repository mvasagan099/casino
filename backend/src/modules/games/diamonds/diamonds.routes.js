import * as diamondsController from './diamonds.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function diamondsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/bet', {
    schema: {
      body: {
        type: 'object', required: ['amount'],
        properties: { amount: { type: 'number', minimum: 0 } },
        additionalProperties: false,
      },
    },
    handler: diamondsController.placeBet,
  });
}
