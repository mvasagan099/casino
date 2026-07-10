import * as walletController from './wallet.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const amountBody = {
  type: 'object',
  required: ['amount'],
  properties: {
    amount: { type: 'number', exclusiveMinimum: 0 },
    description: { type: 'string', maxLength: 255 },
  },
  additionalProperties: false,
};

export default async function walletRoutes(fastify) {
  // All wallet routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /api/wallet/balance
  fastify.get('/balance', { handler: walletController.getBalance });

  // POST /api/wallet/deposit
  fastify.post('/deposit', {
    schema: { body: amountBody },
    handler: walletController.deposit,
  });

  // POST /api/wallet/withdraw
  fastify.post('/withdraw', {
    schema: { body: amountBody },
    handler: walletController.withdraw,
  });

  // GET /api/wallet/transactions
  fastify.get('/transactions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          type: { type: 'string', enum: ['DEPOSIT', 'WITHDRAWAL', 'BET', 'WIN', 'BONUS', 'TRANSFER'] },
        },
      },
    },
    handler: walletController.getTransactions,
  });

  // POST /api/wallet/bonus  (admin can call this too)
  fastify.post('/bonus', {
    schema: { body: amountBody },
    handler: walletController.applyBonus,
  });

  // POST /api/wallet/vault/lock
  fastify.post('/vault/lock', {
    schema: { body: { type: 'object', required: ['amount'], properties: { amount: { type: 'number', exclusiveMinimum: 0 } }, additionalProperties: false } },
    handler: walletController.lockToVault,
  });

  // POST /api/wallet/vault/unlock
  fastify.post('/vault/unlock', {
    schema: { body: { type: 'object', required: ['amount'], properties: { amount: { type: 'number', exclusiveMinimum: 0 } }, additionalProperties: false } },
    handler: walletController.unlockFromVault,
  });
}
