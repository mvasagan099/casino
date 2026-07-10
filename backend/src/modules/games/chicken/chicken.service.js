import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';

const SUCCESS_PROB = { Easy: 0.95, Medium: 0.85, Hard: 0.70, 'Extra Hard': 0.50 };
const MULTIPLIERS = {
  Easy:       [1.04, 1.09, 1.15, 1.21, 1.27, 1.34, 1.41, 1.48, 1.56, 1.64],
  Medium:     [1.15, 1.37, 1.64, 2.00, 2.46, 3.03, 3.73, 4.60, 5.67, 7.00],
  Hard:       [1.40, 1.98, 2.83, 4.04, 5.77, 8.25, 11.78, 16.83, 24.05, 34.35],
  'Extra Hard': [1.96, 3.84, 7.53, 14.76, 28.93, 56.70, 111.14, 217.83, 426.95, 836.83],
};

function generateOutcomes(serverSeed, clientSeed, nonce) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');
  const outcomes = [];
  for (let i = 0; i < 10; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    outcomes.push(byte / 255);
  }
  return outcomes;
}

export async function startGame(fastify, userId, { amount, difficulty }) {
  if (amount < 0) throw new BadRequestError('Bet amount cannot be negative');
  if (!SUCCESS_PROB[difficulty]) throw new BadRequestError('Invalid difficulty');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'chicken' } });
  if (!game || !game.isActive) throw new NotFoundError('Chicken game not available');
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
  const sessionKey = `chicken:${userId}`;
  const session = {
    userId, gameId: game.id, seedId: seed.id,
    amount, difficulty, lane: 0,
    outcomes, status: 'active',
  };
  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);
  return { lane: 0, currentMult: 1.00 };
}

export async function jump(fastify, userId) {
  const sessionKey = `chicken:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Chicken game');

  const session = JSON.parse(raw);
  if (session.status !== 'active') throw new BadRequestError('Game is not active');
  if (session.lane >= 10) throw new BadRequestError('Already at the last lane');

  const prob = SUCCESS_PROB[session.difficulty];
  const roll = session.outcomes[session.lane];
  const survived = roll < prob;
  const nextLane = session.lane + 1;

  if (!survived) {
    session.status = 'crashed';
    await fastify.redis.del(sessionKey);

    await fastify.prisma.$transaction(async (tx) => {
      const bet = await tx.bet.create({
        data: {
          userId, gameId: session.gameId, amount: session.amount, multiplier: 0, payout: 0,
          status: 'LOST', gameData: { difficulty: session.difficulty },
          resultData: { lane: session.lane, crashed: true },
        },
      });
      await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Chicken bet (crashed)' } });
      await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
      await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
    });

    return { survived: false, crashed: true, lane: nextLane };
  }

  session.lane = nextLane;
  const mult = MULTIPLIERS[session.difficulty][nextLane - 1];

  if (nextLane === 10) {
    // Auto cashout at lane 10
    return await _cashout(fastify, userId, session, mult);
  }

  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);
  return { survived: true, crashed: false, lane: nextLane, currentMult: mult };
}

async function _cashout(fastify, userId, session, mult) {
  const payout = parseFloat((session.amount * mult).toFixed(8));
  await fastify.redis.del(`chicken:${userId}`);

  await fastify.prisma.$transaction(async (tx) => {
    const bet = await tx.bet.create({
      data: {
        userId, gameId: session.gameId, amount: session.amount,
        multiplier: mult, payout, status: 'WON',
        gameData: { difficulty: session.difficulty },
        resultData: { lane: session.lane, multiplier: mult },
      },
    });
    if (payout > 0) await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
    await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Chicken bet' } });
    if (payout > 0) await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'Chicken win' } });
    await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'chicken', amount: session.amount, multiplier: mult, payout, won: true });
  return { survived: true, crashed: false, lane: session.lane, currentMult: mult, cashedOut: true, payout };
}

export async function cashout(fastify, userId) {
  const sessionKey = `chicken:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Chicken game');

  const session = JSON.parse(raw);
  if (session.lane === 0) throw new BadRequestError('Cross at least one lane before cashing out');
  const mult = MULTIPLIERS[session.difficulty][session.lane - 1];
  return await _cashout(fastify, userId, session, mult);
}
