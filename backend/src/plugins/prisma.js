import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

/**
 * Fastify plugin that creates a singleton PrismaClient
 * and decorates the Fastify instance with `prisma`.
 */
async function prismaPlugin(fastify) {
  const prisma = new PrismaClient({
    log: fastify.log.level === 'debug'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });

  await prisma.$connect();
  fastify.log.info('✅ PostgreSQL connected via Prisma');

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
    instance.log.info('PostgreSQL disconnected');
  });
}

export default fp(prismaPlugin, {
  name: 'prisma',
});
