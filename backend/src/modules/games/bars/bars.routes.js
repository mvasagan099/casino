import * as barsController from './bars.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
export default async function barsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/bet', {
    schema: {
      body: { 
        type: 'object', 
        required: ['amount', 'difficulty', 'tiles'], 
        properties: { 
          amount: { type: 'number', minimum: 0 },
          difficulty: { type: 'string' },
          tiles: { type: 'array', items: { type: 'number' } }
        }, 
        additionalProperties: false 
      },
    },
    handler: barsController.placeBet,
  });
}
