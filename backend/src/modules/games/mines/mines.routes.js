import * as minesController from './mines.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';

export default async function minesRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/games/mines/start
  fastify.post('/start', {
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'minesCount'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          minesCount: { type: 'integer', minimum: 1, maximum: 24 },
        },
        additionalProperties: false,
      },
    },
    handler: minesController.startGame,
  });

  // POST /api/games/mines/reveal
  fastify.post('/reveal', {
    schema: {
      body: {
        type: 'object',
        required: ['tileIndex'],
        properties: {
          tileIndex: { type: 'integer', minimum: 0, maximum: 24 },
        },
        additionalProperties: false,
      },
    },
    handler: minesController.revealTile,
  });

  // POST /api/games/mines/cashout
  fastify.post('/cashout', {
    schema: { body: { type: 'object', additionalProperties: false } },
    handler: minesController.cashout,
  });
}
