import * as wheelController from './wheel.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
export default async function wheelRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/bet', {
    schema: {
      body: {
        type: 'object', required: ['amount', 'risk'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          risk: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        additionalProperties: false,
      },
    },
    handler: wheelController.placeBet,
  });
}
