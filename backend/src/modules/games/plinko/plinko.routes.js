import * as plinkoController from './plinko.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function plinkoRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);

  fastify.post('/bet', {
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'risk', 'rows'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          risk: { type: 'string', enum: ['low', 'medium', 'high'] },
          rows: { type: 'integer', enum: [8, 10, 12, 14, 16] },
        },
        additionalProperties: false,
      },
    },
    handler: plinkoController.placeBet,
  });
}
