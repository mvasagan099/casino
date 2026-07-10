import * as crashController from './crash.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function crashRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);

  fastify.post('/bet', {
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'cashoutAt'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          cashoutAt: { type: 'number', minimum: 1.01 },
        },
        additionalProperties: false,
      },
    },
    handler: crashController.placeBet,
  });
}
