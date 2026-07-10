import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export async function adminAuthenticate(request, reply) {
  // First, authenticate the user using the existing JWT middleware
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  // Then, check if the user has the 'ADMIN' role
  const user = await request.server.prisma.user.findUnique({
    where: { id: request.user.id },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Admin access required');
  }

  // Attach the full user object to the request for convenience
  request.user = user;
}
