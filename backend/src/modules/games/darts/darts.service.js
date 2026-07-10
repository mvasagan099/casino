import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';
import { incrementNonce } from '../../provably-fair/provably-fair.service.js';

const HOUSE_EDGE = 0.01;

const MULTIPLIERS = {
  Easy: [
    { val: 16.0, weight: 2 }, { val: 6.0, weight: 5 }, { val: 3.1, weight: 15 },
    { val: 1.3, weight: 30 }, { val: 0.6, weight: 28 }, { val: 0.4, weight: 20 }
  ],
  Medium: [
    { val: 16.0, weight: 1 }, { val: 6.0, weight: 2 }, { val: 3.1, weight: 8 },
    { val: 1.3, weight: 20 }, { val: 0.6, weight: 35 }, { val: 0.4, weight: 34 }
  ],
  Hard: [
    { val: 16.0, weight: 0.5 }, { val: 6.0, weight: 1.5 }, { val: 3.1, weight: 5 },
    { val: 1.3, weight: 13 }, { val: 0.6, weight: 40 }, { val: 0.4, weight: 40 }
  ],
};

function pickMultiplier(serverSeed, clientSeed, nonce, difficulty) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');
  const roll = (parseInt(hex.slice(0, 8), 16) / 0xffffffff) * 100;

  const slots = MULTIPLIERS[difficulty] || MULTIPLIERS.Medium;
  let cumulative = 0;
  for (const slot of slots) {
    cumulative += slot.weight;
    if (roll < cumulative) return slot.val;
  }
  return slots[slots.length - 1].val;
}

export async function placeBet(fastify, userId, { amount, difficulty }) {
  if (amount < 0) throw new BadRequestError('Bet amount cannot be negative');
  if (!MULTIPLIERS[difficulty]) throw new BadRequestError('Invalid difficulty');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'darts' } });
  if (!game || !game.isActive) throw new NotFoundError('Darts game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const multiplier = pickMultiplier(seed.serverSeed, seed.clientSeed, seed.nonce, difficulty);
  const payout = parseFloat((amount * multiplier).toFixed(8));
  const won = multiplier >= 1.0;

  await fastify.prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (amount > 0 && Number(wallet.balance) < amount) throw new BadRequestError('Insufficient balance');

    if (amount > 0) {
      await tx.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } });
      if (payout > 0) {
        await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
      }
    }

    const bet = await tx.bet.create({
      data: {
        userId, gameId: game.id, amount, multiplier, payout,
        status: payout > 0 ? 'WON' : 'LOST',
        gameData: { difficulty },
        resultData: { multiplier },
      },
    });
    await tx.transaction.create({ data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Darts bet' } });
    if (payout > 0) {
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'Darts win' } });
    }
    await tx.provablyFairSeed.update({ where: { id: seed.id }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: game.id, userId, seedId: seed.id } });
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'darts', amount, multiplier, payout, won });
  return { multiplier, payout, won };
}
