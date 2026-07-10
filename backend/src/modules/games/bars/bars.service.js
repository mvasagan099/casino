import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';
import { incrementNonce } from '../../provably-fair/provably-fair.service.js';

const HOUSE_EDGE = 0.01;

const MULTIPLIERS = {
  easy: [
    { val: 0.12, prob: 40 },
    { val: 0.18, prob: 30 },
    { val: 0.24, prob: 15 },
    { val: 0.36, prob: 10 },
    { val: 0.80, prob: 4 },
    { val: 2.50, prob: 1 }
  ],
  medium: [
    { val: 0.06, prob: 30 },
    { val: 0.12, prob: 35 },
    { val: 0.24, prob: 20 },
    { val: 0.28, prob: 8 },
    { val: 0.60, prob: 5 },
    { val: 1.20, prob: 1.5 },
    { val: 6.60, prob: 0.5 }
  ],
  hard: [
    { val: 0.01, prob: 40 },
    { val: 0.05, prob: 30 },
    { val: 0.15, prob: 15 },
    { val: 0.50, prob: 10 },
    { val: 2.00, prob: 4 },
    { val: 15.0, prob: 1 }
  ],
  expert: [
    { val: 0.00, prob: 50 },
    { val: 0.02, prob: 25 },
    { val: 0.10, prob: 15 },
    { val: 0.50, prob: 7 },
    { val: 5.00, prob: 2.8 },
    { val: 50.0, prob: 0.2 }
  ]
};

function pickMultiplier(difficulty, rawByte) {
  const table = MULTIPLIERS[difficulty] || MULTIPLIERS.medium;
  const r = (rawByte / 255) * 100;
  let cum = 0;
  for (let item of table) {
    cum += item.prob;
    if (r <= cum) return item.val;
  }
  return table[0].val;
}

export async function placeBet(fastify, userId, { amount, difficulty, tiles }) {
  if (amount < 0) throw new BadRequestError('Bet amount cannot be negative');
  if (!Array.isArray(tiles) || tiles.length === 0 || tiles.length > 5) throw new BadRequestError('Invalid tiles selection');
  if (!difficulty || !MULTIPLIERS[difficulty]) throw new BadRequestError('Invalid difficulty');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'bars' } });
  if (!game || !game.isActive) throw new NotFoundError('Bars game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const hmac = crypto.createHmac('sha256', seed.serverSeed);
  hmac.update(`${seed.clientSeed}:${seed.nonce}`);
  const hex = hmac.digest('hex');
  const buf = Buffer.from(hex, 'hex');

  const grid = [];
  for (let i = 0; i < 30; i++) {
    // take one byte per tile (since buf is 32 bytes, this is fine for 30 tiles)
    grid.push(pickMultiplier(difficulty, buf[i]));
  }

  let sumMultiplier = 0;
  for (let idx of tiles) {
    sumMultiplier += grid[idx];
  }
  // Average the multiplier so RTP stays consistent regardless of tile count
  let rawMultiplier = sumMultiplier / tiles.length;

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
        userId, gameId: game.id, amount, multiplier, payout,
        status: won ? 'WON' : 'LOST',
        gameData: { difficulty, tiles },
        resultData: { grid, multiplier },
      },
    });

    await incrementNonce(tx, seed.id);
    await tx.transaction.create({ data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: newBet.id, description: 'Bars bet' } });

    if (won) {
      await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: newBet.id, description: 'Bars win' } });
    }

    await tx.gameHistory.create({ data: { betId: newBet.id, gameId: game.id, userId, seedId: seed.id } });
    return newBet;
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'bars', amount, multiplier, payout, won });

  return { betId: bet.id, grid, multiplier, payout, won, profit: payout - amount };
}
