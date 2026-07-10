import * as pumpController from './pump.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function pumpRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/start', {
    schema: { body: { type: 'object', required: ['amount', 'difficulty'], properties: { amount: { type: 'number', minimum: 0 }, difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard', 'Expert'] } }, additionalProperties: false } },
    handler: pumpController.startGame,
  });
  fastify.post('/pump', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: pumpController.pump,
  });
  fastify.post('/cashout', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: pumpController.cashout,
  });
}
