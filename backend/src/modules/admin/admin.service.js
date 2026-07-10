export async function getDashboardStats(fastify) {
  const totalUsers = await fastify.prisma.user.count();
  
  const wallets = await fastify.prisma.wallet.aggregate({
    _sum: { balance: true }
  });
  
  const bets = await fastify.prisma.bet.aggregate({
    _count: { id: true },
    _sum: { amount: true, payout: true }
  });
  
  const profits = (bets._sum.amount || 0) - (bets._sum.payout || 0);

  // Recent bets
  const recentBets = await fastify.prisma.bet.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { username: true } }, game: { select: { name: true } } }
  });

  return {
    totalUsers,
    totalBalance: wallets._sum.balance || 0,
    totalWagered: bets._sum.amount || 0,
    totalPayout: bets._sum.payout || 0,
    houseProfit: profits,
    totalBets: bets._count.id || 0,
    recentBets
  };
}

export async function getUsers(fastify, { page = 1, limit = 50 }) {
  const skip = (page - 1) * limit;
  const users = await fastify.prisma.user.findMany({
    skip,
    take: limit,
    include: { wallet: true },
    orderBy: { createdAt: 'desc' }
  });
  
  const total = await fastify.prisma.user.count();
  
  return { users, total, page, totalPages: Math.ceil(total / limit) };
}

export async function banUser(fastify, adminId, userId, reason) {
  const user = await fastify.prisma.user.update({
    where: { id: userId },
    data: { role: 'BANNED' }
  });
  
  await fastify.prisma.adminLog.create({
    data: { adminId, action: 'BAN_USER', targetId: userId, details: { reason } }
  });
  
  return user;
}

export async function unbanUser(fastify, adminId, userId) {
  const user = await fastify.prisma.user.update({
    where: { id: userId },
    data: { role: 'USER' }
  });
  
  await fastify.prisma.adminLog.create({
    data: { adminId, action: 'UNBAN_USER', targetId: userId, details: {} }
  });
  
  return user;
}
