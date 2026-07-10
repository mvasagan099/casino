import * as pfController from './provably-fair.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

export default async function provablyFairRoutes(fastify) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/provably-fair/current
  fastify.get('/current', { handler: pfController.getCurrentSeed });

  // POST /api/provably-fair/rotate
  fastify.post('/rotate', { handler: pfController.rotateSeeds });

  // PATCH /api/provably-fair/client-seed
  fastify.patch('/client-seed', {
    schema: {
      body: {
        type: 'object',
        required: ['clientSeed'],
        properties: { clientSeed: { type: 'string', minLength: 1, maxLength: 128 } },
        additionalProperties: false,
      },
    },
    handler: pfController.updateClientSeed,
  });

  // POST /api/provably-fair/verify (public — no auth needed)
  fastify.post('/verify', {
    config: { auth: false },
    schema: {
      body: {
        type: 'object',
        required: ['serverSeed', 'clientSeed', 'nonce'],
        properties: {
          serverSeed: { type: 'string' },
          clientSeed: { type: 'string' },
          nonce: { type: 'integer', minimum: 0 },
        },
        additionalProperties: false,
      },
    },
    handler: pfController.verifyBet,
  });
}
