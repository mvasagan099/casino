import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';

const DIFFICULTIES = {
  Easy:   { increment: 1.10, surviveChance: 0.89 },
  Medium: { increment: 1.25, surviveChance: 0.784 },
  Hard:   { increment: 1.50, surviveChance: 0.653 },
  Expert: { increment: 2.00, surviveChance: 0.49 },
};

// Pre-generate a sequence of outcomes from seed
function generateOutcomes(serverSeed, clientSeed, nonce, count = 50) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');
  const outcomes = [];
  for (let i = 0; i < count; i++) {
    const byte = parseInt(hex.slice((i * 2) % 60, (i * 2) % 60 + 2), 16);
    outcomes.push(byte / 255);
  }
  return outcomes;
}

export async function startGame(fastify, userId, { amount, difficulty }) {
  if (amount < 0) throw new BadRequestError('Bet amount cannot be negative');
  if (!DIFFICULTIES[difficulty]) throw new BadRequestError('Invalid difficulty');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'pump' } });
  if (!game || !game.isActive) throw new NotFoundError('Pump game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  await fastify.prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (amount > 0 && Number(wallet.balance) < amount) throw new BadRequestError('Insufficient balance');
    if (amount > 0) await tx.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } });
  });

  const outcomes = generateOutcomes(seed.serverSeed, seed.clientSeed, seed.nonce);
  const sessionKey = `pump:${userId}`;
  const session = {
    userId, gameId: game.id, seedId: seed.id, nonce: seed.nonce,
    amount, difficulty, pumpCount: 0, currentMult: 1.00,
    outcomes, status: 'active',
  };
  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);
  return { currentMult: 1.00 };
}

export async function pump(fastify, userId) {
  const sessionKey = `pump:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Pump game');

  const session = JSON.parse(raw);
  if (session.status !== 'active') throw new BadRequestError('Game is not active');

  const diff = DIFFICULTIES[session.difficulty];
  const roll = session.outcomes[session.pumpCount];

  if (roll >= diff.surviveChance) {
    // Burst
    session.status = 'burst';
    await fastify.redis.del(sessionKey);

    await fastify.prisma.$transaction(async (tx) => {
      const bet = await tx.bet.create({
        data: {
          userId, gameId: session.gameId, amount: session.amount, multiplier: 0, payout: 0,
          status: 'LOST', gameData: { difficulty: session.difficulty },
          resultData: { pumpCount: session.pumpCount, burst: true },
        },
      });
      await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Pump bet (burst)' } });
      await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
      await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
    });

    return { survived: false, burst: true, pumpCount: session.pumpCount };
  }

  session.pumpCount++;
  session.currentMult = parseFloat((session.currentMult * diff.increment).toFixed(4));
  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);
  return { survived: true, burst: false, pumpCount: session.pumpCount, currentMult: session.currentMult };
}

export async function cashout(fastify, userId) {
  const sessionKey = `pump:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Pump game');

  const session = JSON.parse(raw);
  if (session.pumpCount === 0) throw new BadRequestError('Pump at least once before cashing out');

  const payout = parseFloat((session.amount * session.currentMult).toFixed(8));
  await fastify.redis.del(sessionKey);

  await fastify.prisma.$transaction(async (tx) => {
    const bet = await tx.bet.create({
      data: {
        userId, gameId: session.gameId, amount: session.amount,
        multiplier: session.currentMult, payout, status: 'WON',
        gameData: { difficulty: session.difficulty },
        resultData: { pumpCount: session.pumpCount, multiplier: session.currentMult },
      },
    });
    if (payout > 0) await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
    await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Pump bet' } });
    if (payout > 0) {
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'Pump win' } });
    }
    await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'pump', amount: session.amount, multiplier: session.currentMult, payout, won: true });
  return { payout, multiplier: session.currentMult };
}
