import * as dartsController from './darts.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function dartsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/bet', {
    schema: {
      body: {
        type: 'object', required: ['amount', 'difficulty'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard'] },
        },
        additionalProperties: false,
      },
    },
    handler: dartsController.placeBet,
  });
}
