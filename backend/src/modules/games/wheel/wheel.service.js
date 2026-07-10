import { BadRequestError, NotFoundError } from '../../../utils/errors.js';
import { generateResult, incrementNonce } from '../../provably-fair/provably-fair.service.js';

/**
 * Wheel game service.
 *
 * Rules:
 * - Player picks risk (low/medium/high) and segments count.
 * - Wheel spins; result mapped to a multiplier bucket.
 */

const HOUSE_EDGE = 0.01;

const WHEEL_SEGMENTS = {
  low: [0, 1.2, 1.5, 0, 1.2, 1.5, 0, 1.2, 2, 0, 1.2, 1.5, 0, 1.2, 1.5, 0, 1.2, 2, 0, 1.2, 1.5, 0, 1.2, 1.5, 0, 1.2, 2, 0, 1.2, 1.5, 0, 1.2, 1.5, 0, 1.2, 2, 0, 1.2, 1.5, 0, 1.2, 1.5, 0, 1.2, 2, 0, 1.2, 1.5, 0, 3],
  medium: [0, 1.5, 0, 2, 0, 1.5, 0, 3, 0, 1.5, 0, 2, 0, 1.5, 0, 4, 0, 1.5, 0, 2, 0, 1.5, 0, 3, 0, 1.5, 0, 2, 0, 1.5, 0, 4, 0, 1.5, 0, 2, 0, 1.5, 0, 3, 0, 1.5, 0, 2, 0, 1.5, 0, 4, 0, 6],
  high: [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 40, 0, 50],
};

export async function placeBet(fastify, userId, { amount, risk }) {
  if (amount < 0) throw new BadRequestError('Bet amount must be positive');
  if (!['low', 'medium', 'high'].includes(risk)) throw new BadRequestError('Risk must be low, medium, or high');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'wheel' } });
  if (!game || !game.isActive) throw new NotFoundError('Wheel game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const raw = generateResult(seed.serverSeed, seed.clientSeed, seed.nonce); // 0–100
  const segments = WHEEL_SEGMENTS[risk];
  const segmentIndex = Math.floor((raw / 100) * segments.length);
  const rawMultiplier = segments[Math.min(segmentIndex, segments.length - 1)];
  const multiplier = parseFloat((rawMultiplier * (1 - HOUSE_EDGE)).toFixed(4));
  const payout = parseFloat((amount * multiplier).toFixed(8));
  const won = multiplier > 0;

  const bet = await fastify.prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (Number(wallet.balance) < amount) throw new BadRequestError('Insufficient balance');

    await tx.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } });

    const newBet = await tx.bet.create({
      data: {
        userId, gameId: game.id, amount, multiplier, payout,
        status: won ? 'WON' : 'LOST',
        gameData: { risk },
        resultData: { segmentIndex, multiplier },
      },
    });

    await incrementNonce(tx, seed.id);
    await tx.transaction.create({ data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: newBet.id, description: 'Wheel bet' } });

    if (won) {
      await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: newBet.id, description: 'Wheel win' } });
    }

    await tx.gameHistory.create({ data: { betId: newBet.id, gameId: game.id, userId, seedId: seed.id } });
    return newBet;
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'wheel', amount, multiplier, payout, won });

  return { betId: bet.id, segmentIndex, multiplier, payout, won, profit: payout - amount };
}
