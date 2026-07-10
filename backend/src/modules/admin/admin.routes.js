import * as adminController from './admin.controller.js';
import { adminAuthenticate } from '../../middlewares/adminAuthenticate.js';

export default async function adminRoutes(fastify) {
  // All routes in this module require admin privileges
  fastify.addHook('preHandler', adminAuthenticate);

  fastify.get('/stats', {
    handler: adminController.getDashboardStats,
  });

  fastify.get('/users', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
    },
    handler: adminController.getUsers,
  });

  fastify.post('/users/ban', {
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'reason'],
        properties: {
          userId: { type: 'string' },
          reason: { type: 'string', minLength: 3 },
        },
      },
    },
    handler: adminController.banUser,
  });

  fastify.post('/users/unban', {
    schema: {
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
        },
      },
    },
    handler: adminController.unbanUser,
  });
}
