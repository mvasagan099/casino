import { ForbiddenError } from '../utils/errors.js';

/**
 * Creates a preHandler hook that checks if the authenticated user
 * has one of the required roles.
 * 
 * Usage:
 *   { preHandler: [authenticate, authorize('ADMIN', 'MODERATOR')] }
 * 
 * @param {...string} roles - Allowed roles
 * @returns {Function} Fastify preHandler hook
 */
export function authorize(...roles) {
  return async function (request, reply) {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    if (!roles.includes(request.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${roles.join(' or ')}`
      );
    }
  };
}
