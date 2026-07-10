import { UnauthorizedError } from '../utils/errors.js';

/**
 * Fastify preHandler hook that verifies the JWT access token.
 * Decodes the token and attaches the user payload to `request.user`.
 */
export async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}
