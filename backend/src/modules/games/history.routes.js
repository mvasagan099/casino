export default async function historyRoutes(fastify, opts) {
  fastify.get('/history', async (request, reply) => {
    try {
      const bets = await fastify.prisma.bet.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          game: { select: { name: true } },
          user: { select: { username: true } },
        }
      });
      
      const formatted = bets.map(b => {
        const date = new Date(b.createdAt);
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const time = `${hours}:${minutes} ${ampm}`;
        
        const isWon = Number(b.payout) > Number(b.amount);
  
        return {
          id: b.id,
          game: b.game?.name || 'Unknown',
          user: b.user?.username || 'Hidden',
          time,
          amount: Number(b.amount).toFixed(8),
          curr: 'T',
          mult: Number(b.multiplier).toFixed(2) + '×',
          payout: Number(b.payout).toFixed(8),
          curr2: 'T',
          positive: isWon
        };
      });
      
      return { success: true, data: formatted };
    } catch (error) {
      fastify.log.error(error);
      return { success: false, error: 'Failed to fetch history' };
    }
  });

  fastify.get('/leaderboard', async (request, reply) => {
    try {
      const grouped = await fastify.prisma.bet.groupBy({
        by: ['userId'],
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10
      });
      
      const userIds = grouped.map(g => g.userId);
      const users = await fastify.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true }
      });
      const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.username }), {});
      
      const prizes = ['$25,000.00', '$12,000.00', '$8,000.00', '$6,000.00', '$5,000.00', '$3,500.00', '$2,000.00', '$1,000.00', '$500.00', '$250.00'];

      const leaderboard = grouped.map((g, i) => {
        const wageredVal = Number(g._sum.amount || 0);
        // Fallback simple formatting to emulate the UI
        const formattedWagered = '$' + wageredVal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return {
          rank: i + 1,
          user: userMap[g.userId] || 'Hidden',
          hidden: false,
          wagered: formattedWagered,
          prize: prizes[i] || '$0.00'
        };
      });
      
      return { success: true, data: leaderboard };
    } catch (error) {
      fastify.log.error(error);
      return { success: false, error: 'Failed to fetch leaderboard' };
    }
  });
}
