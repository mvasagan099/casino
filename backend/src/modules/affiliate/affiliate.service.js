import { NotFoundError } from '../../utils/errors.js';

export async function getAffiliateStats(fastify, userId) {
  const affiliate = await fastify.prisma.affiliate.findUnique({
    where: { userId }
  });

  if (!affiliate) {
    throw new NotFoundError('Affiliate profile not found');
  }

  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: { referrals: true }
      }
    }
  });

  return {
    commissionRate: affiliate.commissionRate,
    totalEarnings: affiliate.totalEarnings,
    affiliateCode: user.affiliateCode,
    totalReferrals: user._count.referrals
  };
}

export async function getAffiliateHistory(fastify, userId) {
  // Returns transactions where type is AFFILIATE_COMMISSION
  const history = await fastify.prisma.transaction.findMany({
    where: {
      userId,
      type: 'AFFILIATE_COMMISSION'
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return history;
}
