import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';

const HOLES = 7;

function generateMolePositions(serverSeed, clientSeed, nonce, numMoles) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');

  // Generate all hole positions then pick numMoles using seeded shuffle
  const positions = Array.from({ length: HOLES }, (_, i) => i);
  const bytes = Buffer.from(hex.repeat(4), 'hex');
  for (let i = positions.length - 1; i > 0; i--) {
    const byteIndex = (positions.length - 1 - i) * 4;
    const rand = bytes.readUInt32BE(byteIndex % (bytes.length - 4)) % (i + 1);
    [positions[i], positions[rand]] = [positions[rand], positions[i]];
  }
  return positions.slice(0, numMoles).sort((a, b) => a - b);
}

function calcMultiplier(hits, numMoles) {
  if (hits === 0) return 1.00;
  return parseFloat((0.98 * Math.pow(HOLES / numMoles, hits)).toFixed(4));
}

export async function startGame(fastify, userId, { amount, numMoles }) {
  if (amount < 0) throw new BadRequestError('Bet amount cannot be negative');
  if (numMoles < 1 || numMoles > 6) throw new BadRequestError('numMoles must be 1–6');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'moles' } });
  if (!game || !game.isActive) throw new NotFoundError('Moles game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  // Deduct bet
  await fastify.prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (amount > 0 && Number(wallet.balance) < amount) throw new BadRequestError('Insufficient balance');
    if (amount > 0) {
      await tx.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } });
    }
  });

  const molePositions = generateMolePositions(seed.serverSeed, seed.clientSeed, seed.nonce, numMoles);
  const sessionKey = `moles:${userId}`;
  const session = {
    userId, gameId: game.id, seedId: seed.id, nonce: seed.nonce,
    amount, numMoles, molePositions, hits: 0, status: 'active',
  };
  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);
  return { currentMult: 1.00, nextMult: calcMultiplier(1, numMoles) };
}

export async function pick(fastify, userId, { holeIndex }) {
  const sessionKey = `moles:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Moles game');

  const session = JSON.parse(raw);
  if (session.status !== 'active') throw new BadRequestError('Game is not active');
  if (holeIndex < 0 || holeIndex >= HOLES) throw new BadRequestError('Invalid hole');

  const isHit = session.molePositions.includes(holeIndex);

  if (!isHit) {
    // Lost
    session.status = 'lost';
    await fastify.redis.del(sessionKey);

    await fastify.prisma.$transaction(async (tx) => {
      const bet = await tx.bet.create({
        data: {
          userId, gameId: session.gameId, amount: session.amount, multiplier: 0, payout: 0,
          status: 'LOST', gameData: { numMoles: session.numMoles },
          resultData: { molePositions: session.molePositions, holeIndex, hits: session.hits },
        },
      });
      await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Moles bet (lost)' } });
      await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
      await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
    });

    return { isHit: false, lost: true, molePositions: session.molePositions };
  }

  session.hits++;
  const currentMult = calcMultiplier(session.hits, session.numMoles);
  const nextMult = calcMultiplier(session.hits + 1, session.numMoles);

  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);
  return { isHit: true, lost: false, hits: session.hits, currentMult, nextMult };
}

export async function cashout(fastify, userId) {
  const sessionKey = `moles:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Moles game');

  const session = JSON.parse(raw);
  if (session.hits === 0) throw new BadRequestError('Make at least one correct pick first');

  const multiplier = calcMultiplier(session.hits, session.numMoles);
  const payout = parseFloat((session.amount * multiplier).toFixed(8));
  await fastify.redis.del(sessionKey);

  await fastify.prisma.$transaction(async (tx) => {
    const bet = await tx.bet.create({
      data: {
        userId, gameId: session.gameId, amount: session.amount, multiplier, payout,
        status: 'WON', gameData: { numMoles: session.numMoles },
        resultData: { hits: session.hits, multiplier },
      },
    });
    if (payout > 0) {
      await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
    }
    await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Moles bet' } });
    if (payout > 0) {
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'Moles win' } });
    }
    await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'moles', amount: session.amount, multiplier, payout, won: true });
  return { payout, multiplier };
}
