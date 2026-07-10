import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';

const MOVES = ['Rock', 'Paper', 'Scissors'];
const BEATS = { Rock: 'Scissors', Paper: 'Rock', Scissors: 'Paper' };

function generateMoves(serverSeed, clientSeed, nonce, count = 20) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');
  const results = [];
  for (let i = 0; i < count; i++) {
    const byte = parseInt(hex.slice((i * 2) % 60, (i * 2) % 60 + 2), 16);
    results.push(MOVES[byte % 3]);
  }
  return results;
}

export async function startGame(fastify, userId, { amount }) {
  if (amount < 0) throw new BadRequestError('Bet amount cannot be negative');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'rps' } });
  if (!game || !game.isActive) throw new NotFoundError('RPS game not available');
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

  const computerMoves = generateMoves(seed.serverSeed, seed.clientSeed, seed.nonce);
  const sessionKey = `rps:${userId}`;
  const session = {
    userId, gameId: game.id, seedId: seed.id,
    amount, streak: 0, currentMult: 1.00,
    computerMoves, roundIndex: 0, status: 'active',
  };
  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);
  return { streak: 0, currentMult: 1.00 };
}

export async function move(fastify, userId, { playerMove }) {
  const sessionKey = `rps:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active RPS game');

  const session = JSON.parse(raw);
  if (session.status !== 'active') throw new BadRequestError('Game is not active');

  const computerMove = session.computerMoves[session.roundIndex % session.computerMoves.length];
  session.roundIndex++;

  let result;
  if (BEATS[playerMove] === computerMove) result = 'win';
  else if (BEATS[computerMove] === playerMove) result = 'lose';
  else result = 'tie';

  if (result === 'lose') {
    session.status = 'lost';
    await fastify.redis.del(sessionKey);

    await fastify.prisma.$transaction(async (tx) => {
      const bet = await tx.bet.create({
        data: {
          userId, gameId: session.gameId, amount: session.amount, multiplier: 0, payout: 0,
          status: 'LOST', gameData: {},
          resultData: { playerMove, computerMove, result: 'lose', streak: session.streak },
        },
      });
      await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'RPS bet (lost)' } });
      await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
      await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
    });

    return { result: 'lose', playerMove, computerMove, streak: session.streak, lost: true };
  }

  if (result === 'win') {
    session.streak++;
    session.currentMult = parseFloat((1.96 * Math.pow(2, session.streak - 1)).toFixed(4));
  }

  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);
  return { result, playerMove, computerMove, streak: session.streak, currentMult: session.currentMult, lost: false };
}

export async function cashout(fastify, userId) {
  const sessionKey = `rps:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active RPS game');

  const session = JSON.parse(raw);
  if (session.streak === 0) throw new BadRequestError('Win at least one round before cashing out');

  const payout = parseFloat((session.amount * session.currentMult).toFixed(8));
  await fastify.redis.del(sessionKey);

  await fastify.prisma.$transaction(async (tx) => {
    const bet = await tx.bet.create({
      data: {
        userId, gameId: session.gameId, amount: session.amount,
        multiplier: session.currentMult, payout, status: 'WON',
        gameData: {}, resultData: { streak: session.streak, multiplier: session.currentMult },
      },
    });
    if (payout > 0) await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
    await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'RPS bet' } });
    if (payout > 0) await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'RPS win' } });
    await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'rps', amount: session.amount, multiplier: session.currentMult, payout, won: true });
  return { payout, multiplier: session.currentMult };
}
