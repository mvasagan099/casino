import * as hiloController from './hilo.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function hiloRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);

  fastify.post('/start', {
    schema: { body: { type: 'object', required: ['amount'], properties: { amount: { type: 'number', minimum: 0 } }, additionalProperties: false } },
    handler: hiloController.startGame,
  });

  fastify.post('/guess', {
    schema: { body: { type: 'object', required: ['direction'], properties: { direction: { type: 'string', enum: ['higher', 'lower', 'skip'] } }, additionalProperties: false } },
    handler: hiloController.guess,
  });

  fastify.post('/cashout', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: hiloController.cashout,
  });
}
