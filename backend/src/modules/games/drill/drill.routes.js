import * as drillController from './drill.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
export default async function drillRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);
  fastify.post('/start', {
    schema: { body: { type: 'object', required: ['amount'], properties: { amount: { type: 'number', minimum: 0 } }, additionalProperties: false } },
    handler: drillController.startGame,
  });
  fastify.post('/pick', {
    schema: { body: { type: 'object', required: ['colIndex'], properties: { colIndex: { type: 'integer', minimum: 0, maximum: 4 } }, additionalProperties: false } },
    handler: drillController.pickCell,
  });
  fastify.post('/cashout', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: drillController.cashout,
  });
}
