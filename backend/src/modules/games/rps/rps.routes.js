import * as rpsController from './rps.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function rpsRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/start', {
    schema: { body: { type: 'object', required: ['amount'], properties: { amount: { type: 'number', minimum: 0 } }, additionalProperties: false } },
    handler: rpsController.startGame,
  });
  fastify.post('/move', {
    schema: { body: { type: 'object', required: ['playerMove'], properties: { playerMove: { type: 'string', enum: ['Rock', 'Paper', 'Scissors'] } }, additionalProperties: false } },
    handler: rpsController.move,
  });
  fastify.post('/cashout', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: rpsController.cashout,
  });
}
