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
}
