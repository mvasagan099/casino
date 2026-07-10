import * as primediceController from './primedice.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function primediceRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/bet', {
    schema: {
      body: {
        type: 'object', required: ['amount', 'minVal', 'maxVal'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          minVal: { type: 'number', minimum: 0, maximum: 99 },
          maxVal: { type: 'number', minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
    },
    handler: primediceController.placeBet,
  });
}
