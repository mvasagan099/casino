import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';
import { incrementNonce } from '../../provably-fair/provably-fair.service.js';

/**
 * Crash game service.
 *
 * Rules:
 * - Player bets and sets an auto-cashout multiplier (or cashes out manually).
 * - The crash point is generated from the seed using HMAC-SHA256.
 * - If crash point >= cashout multiplier: win. Otherwise: lose.
 * - House edge: ~1% (built into crash point formula).
 */

const HOUSE_EDGE = 0.01;

/**
 * Generate crash point from seed. Formula mirrors Stake's provably fair crash.
 * Result is always >= 1.00x.
 */
function generateCrashPoint(serverSeed, clientSeed, nonce) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');

  const h = parseInt(hex.slice(0, 8), 16);
  const e = 2 ** 32;

  // House edge: ~1% chance of instant crash (1.00x)
  if (h % 33 === 0) return 1.0;

  const crashPoint = Math.floor((100 * e - h) / (e - h)) / 100;
  return Math.max(1.0, crashPoint);
}

export async function placeBet(fastify, userId, { amount, cashoutAt }) {
  if (amount < 0) throw new BadRequestError('Bet amount must be positive');
  if (cashoutAt < 1.01) throw new BadRequestError('cashoutAt must be at least 1.01');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'crash' } });
  if (!game || !game.isActive) throw new NotFoundError('Crash game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const crashPoint = generateCrashPoint(seed.serverSeed, seed.clientSeed, seed.nonce);
  const won = cashoutAt <= crashPoint;
  const multiplier = won ? cashoutAt : 0;
  const payout = won ? parseFloat((amount * multiplier).toFixed(8)) : 0;

  const bet = await fastify.prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (Number(wallet.balance) < amount) throw new BadRequestError('Insufficient balance');

    await tx.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } });

    const newBet = await tx.bet.create({
      data: {
        userId,
        gameId: game.id,
        amount,
        multiplier: won ? cashoutAt : crashPoint,
        payout,
        status: won ? 'WON' : 'LOST',
        gameData: { cashoutAt },
        resultData: { crashPoint, won },
      },
    });

    await incrementNonce(tx, seed.id);

    await tx.transaction.create({ data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: newBet.id, description: 'Crash bet' } });

    if (won) {
      await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: newBet.id, description: 'Crash win' } });
    }

    await tx.gameHistory.create({ data: { betId: newBet.id, gameId: game.id, userId, seedId: seed.id } });

    return newBet;
  });

  if (fastify.io) {
    fastify.io.emit('bet:placed', { game: 'crash', amount, multiplier: won ? cashoutAt : crashPoint, payout, won });
  }

  return { betId: bet.id, crashPoint, cashoutAt, won, amount, multiplier: won ? cashoutAt : crashPoint, payout, profit: payout - amount };
}
