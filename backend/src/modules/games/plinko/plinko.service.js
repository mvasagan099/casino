import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';
import { incrementNonce } from '../../provably-fair/provably-fair.service.js';

/**
 * Plinko game service.
 *
 * Rules:
 * - 16 rows of pegs; ball drops and hits left/right each row (from seed).
 * - The final bucket determines the multiplier (ranges from 0.2x to 1000x, risk-dependent).
 * - Risk levels: low, medium, high.
 */

const HOUSE_EDGE = 0.01;

const MULTIPLIERS = {
  low: {
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  },
  high: {
    16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};

/**
 * Generate ball path (left=0/right=1 per row) from seed.
 */
function generatePath(serverSeed, clientSeed, nonce, rows) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');

  const path = [];
  for (let i = 0; i < rows; i++) {
    const byteIndex = i * 2;
    const byte = parseInt(hex.slice(byteIndex % (hex.length - 2), byteIndex % (hex.length - 2) + 2), 16);
    path.push(byte % 2); // 0=left, 1=right
  }
  return path;
}

export async function placeBet(fastify, userId, { amount, risk, rows }) {
  if (amount < 0) throw new BadRequestError('Bet amount must be positive');
  if (!['low', 'medium', 'high'].includes(risk)) throw new BadRequestError('Risk must be low, medium, or high');
  const validRows = [8, 10, 12, 14, 16];
  if (!validRows.includes(rows)) throw new BadRequestError('Invalid row count');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'plinko' } });
  if (!game || !game.isActive) throw new NotFoundError('Plinko game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const path = generatePath(seed.serverSeed, seed.clientSeed, seed.nonce, rows);
  const bucketIndex = path.reduce((pos, dir) => pos + dir, 0); // 0 to rows

  // Use 16-row multiplier table as default; scale bucket for smaller rows
  const table = MULTIPLIERS[risk][16];
  const normalizedBucket = Math.round((bucketIndex / rows) * 16);
  const multiplier = parseFloat((table[normalizedBucket] * (1 - HOUSE_EDGE)).toFixed(4));

  const payout = parseFloat((amount * multiplier).toFixed(8));
  const won = multiplier >= 1;

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
        multiplier,
        payout,
        status: payout > 0 ? 'WON' : 'LOST',
        gameData: { risk, rows },
        resultData: { path, bucketIndex, multiplier },
      },
    });

    await incrementNonce(tx, seed.id);

    await tx.transaction.create({ data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: newBet.id, description: 'Plinko bet' } });

    if (payout > 0) {
      await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: newBet.id, description: 'Plinko win' } });
    }

    await tx.gameHistory.create({ data: { betId: newBet.id, gameId: game.id, userId, seedId: seed.id } });
    return newBet;
  });

  if (fastify.io) {
    fastify.io.emit('bet:placed', { game: 'plinko', amount, multiplier, payout, won });
  }

  return { betId: bet.id, path, bucketIndex, multiplier, payout, won, profit: payout - amount };
}
