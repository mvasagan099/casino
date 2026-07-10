import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

/**
 * Fastify plugin that creates a singleton PrismaClient
 * and decorates the Fastify instance with `prisma`.
 */
async function prismaPlugin(fastify) {
  const basePrisma = new PrismaClient({
    log: fastify.log.level === 'debug'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });

  const prisma = basePrisma.$extends({
    query: {
      bet: {
        async create({ args, query }) {
          const bet = await query(args);
          await processCommission(this, bet);
          return bet;
        },
        async update({ args, query }) {
          const bet = await query(args);
          await processCommission(this, bet);
          return bet;
        }
      }
    }
  });

  async function processCommission(tx, bet) {
    if (!bet || (bet.status !== 'WON' && bet.status !== 'LOST')) return;
    
    // Check if we already processed commission for this bet
    // To prevent double processing on multiple updates, we check if there's already a commission transaction for it
    const existing = await tx.transaction.findFirst({
      where: { type: 'AFFILIATE_COMMISSION', referenceId: bet.id }
    });
    if (existing) return;

    const houseProfit = Number(bet.amount) - Number(bet.payout);
    if (houseProfit <= 0) return; // Floor at 0 for affiliate commission

    const user = await tx.user.findUnique({ where: { id: bet.userId }, select: { referredById: true } });
    if (!user || !user.referredById) return;

    const affiliate = await tx.affiliate.findUnique({ where: { userId: user.referredById } });
    if (!affiliate) return;

    const commission = houseProfit * Number(affiliate.commissionRate);
    if (commission <= 0) return;

    await tx.wallet.update({
      where: { userId: user.referredById },
      data: { balance: { increment: commission } }
    });

    await tx.affiliate.update({
      where: { userId: user.referredById },
      data: { totalEarnings: { increment: commission } }
    });

    await tx.transaction.create({
      data: {
        userId: user.referredById,
        amount: commission,
        type: 'AFFILIATE_COMMISSION',
        status: 'COMPLETED',
        referenceId: bet.id,
        description: `Commission from user ${bet.userId}`
      }
    });
  }

  await prisma.$connect();
  fastify.log.info('✅ PostgreSQL connected via Prisma');

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (instance) => {
    await basePrisma.$disconnect();
    instance.log.info('PostgreSQL disconnected');
  });
}

export default fp(prismaPlugin, {
  name: 'prisma',
});
