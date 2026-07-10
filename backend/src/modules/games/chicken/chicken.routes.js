import * as chickenController from './chicken.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function chickenRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/start', {
    schema: { body: { type: 'object', required: ['amount', 'difficulty'], properties: { amount: { type: 'number', minimum: 0 }, difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard', 'Extra Hard'] } }, additionalProperties: false } },
    handler: chickenController.startGame,
  });
  fastify.post('/jump', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: chickenController.jump,
  });
  fastify.post('/cashout', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: chickenController.cashout,
  });
}
