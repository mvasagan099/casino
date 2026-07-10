import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';
import { incrementNonce } from '../../provably-fair/provably-fair.service.js';

/**
 * Keno game service.
 *
 * Rules:
 * - Player picks 1–10 numbers from 1–40.
 * - 20 numbers are drawn from the seed.
 * - Payout depends on how many picks match the draw (hit count).
 */

const HOUSE_EDGE = 0.01;

const PAYOUT_TABLE = {
  1:  [0, 3.72],
  2:  [0, 0, 8.84],
  3:  [0, 0, 2.65, 25.15],
  4:  [0, 0, 1.18, 6.5, 90.50],
  5:  [0, 0, 0, 3, 13, 300],
  6:  [0, 0, 0, 1.5, 5, 40, 600],
  7:  [0, 0, 0, 1.1, 3, 14, 100, 900],
  8:  [0, 0, 0, 0.5, 2, 8, 40, 200, 1000],
  9:  [0, 0, 0, 0.5, 1.5, 6, 25, 100, 500, 2000],
  10: [0, 0, 0, 0, 1, 4, 14, 60, 200, 800, 3000],
};

function generateDraw(serverSeed, clientSeed, nonce, count = 20, range = 40) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');

  const numbers = Array.from({ length: range }, (_, i) => i + 1);
  const bytes = Buffer.from(hex.repeat(4), 'hex');
  for (let i = numbers.length - 1; i > 0; i--) {
    const byteIndex = (numbers.length - 1 - i) * 4;
    const rand = bytes.readUInt32BE(byteIndex % (bytes.length - 4)) % (i + 1);
    [numbers[i], numbers[rand]] = [numbers[rand], numbers[i]];
  }
  return numbers.slice(0, count).sort((a, b) => a - b);
}

export async function placeBet(fastify, userId, { amount, picks }) {
  if (amount < 0) throw new BadRequestError('Bet amount must be positive');
  if (!Array.isArray(picks) || picks.length < 1 || picks.length > 10) throw new BadRequestError('Pick 1–10 numbers');
  if (new Set(picks).size !== picks.length) throw new BadRequestError('Duplicate picks not allowed');
  if (picks.some(n => n < 1 || n > 40)) throw new BadRequestError('Pick numbers must be 1–40');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'keno' } });
  if (!game || !game.isActive) throw new NotFoundError('Keno game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const draw = generateDraw(seed.serverSeed, seed.clientSeed, seed.nonce);
  const hits = picks.filter(n => draw.includes(n)).length;
  const table = PAYOUT_TABLE[picks.length];
  const rawMultiplier = table[hits] || 0;
  const multiplier = parseFloat((rawMultiplier * (1 - HOUSE_EDGE)).toFixed(4));
  const payout = parseFloat((amount * multiplier).toFixed(8));
  const won = payout > 0;

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
        status: won ? 'WON' : 'LOST',
        gameData: { picks },
        resultData: { draw, hits, multiplier },
      },
    });

    await incrementNonce(tx, seed.id);

    await tx.transaction.create({ data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: newBet.id, description: 'Keno bet' } });

    if (won) {
      await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: newBet.id, description: 'Keno win' } });
    }

    await tx.gameHistory.create({ data: { betId: newBet.id, gameId: game.id, userId, seedId: seed.id } });
    return newBet;
  });

  if (fastify.io) {
    fastify.io.emit('bet:placed', { game: 'keno', amount, multiplier, payout, won });
  }

  return { betId: bet.id, picks, draw, hits, multiplier, payout, won, profit: payout - amount };
}
