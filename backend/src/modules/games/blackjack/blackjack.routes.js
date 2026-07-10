import * as blackjackController from './blackjack.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function blackjackRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/start', {
    schema: { body: { type: 'object', required: ['amount'], properties: { amount: { type: 'number', minimum: 0 } }, additionalProperties: false } },
    handler: blackjackController.startGame,
  });
  fastify.post('/hit', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: blackjackController.hit,
  });
  fastify.post('/stand', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: blackjackController.stand,
  });
  fastify.post('/double', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: blackjackController.doubleDown,
  });
}
