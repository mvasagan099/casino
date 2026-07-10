import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';
import { incrementNonce } from '../../provably-fair/provably-fair.service.js';

/**
 * Drill game service.
 *
 * Rules:
 * - Player picks a row (1–5) on a 5x5 grid, each row has hidden gold or rock.
 * - Each correct row multiplies the payout. Hit a rock → bust.
 * - Similar to Mines but sequential row-based revealing.
 */

const HOUSE_EDGE = 0.01;
const ROWS = 5;
const COLS = 5;
const GOLD_PER_ROW = 3; // 3 gold, 2 rocks per row

function generateGrid(serverSeed, clientSeed, nonce) {
  const grid = [];
  for (let row = 0; row < ROWS; row++) {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${row}`);
    const hex = hmac.digest('hex');

    const cols = Array.from({ length: COLS }, (_, i) => i);
    const bytes = Buffer.from(hex, 'hex');
    for (let i = cols.length - 1; i > 0; i--) {
      const rand = bytes[i % bytes.length] % (i + 1);
      [cols[i], cols[rand]] = [cols[rand], cols[i]];
    }
    // First GOLD_PER_ROW are gold
    grid.push(cols.map((_, idx) => idx < GOLD_PER_ROW ? 'gold' : 'rock'));
  }
  return grid;
}

function rowMultiplier(rowsCompleted) {
  // Multiplier grows with each correct row
  const base = COLS / GOLD_PER_ROW; // 5/3 ≈ 1.67
  return parseFloat(Math.pow(base, rowsCompleted).toFixed(4));
}

export async function startGame(fastify, userId, { amount }) {
  if (amount < 0) throw new BadRequestError('Bet amount must be positive');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'drill' } });
  if (!game || !game.isActive) throw new NotFoundError('Drill game not available');

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const grid = [];
  for (let row = 0; row < ROWS; row++) {
    const hmac = crypto.createHmac('sha256', seed.serverSeed);
    hmac.update(`${seed.clientSeed}:${seed.nonce}:${row}`);
    const hex = hmac.digest('hex');
    const cols = Array.from({ length: COLS }, (_, i) => i);
    const bytes = Buffer.from(hex, 'hex');
    for (let i = cols.length - 1; i > 0; i--) {
      const rand = bytes[i % bytes.length] % (i + 1);
      [cols[i], cols[rand]] = [cols[rand], cols[i]];
    }
    grid.push(cols.map((_, idx) => idx < GOLD_PER_ROW ? 'gold' : 'rock'));
  }

  await fastify.prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUnique({ where: { userId } });
    if (!w) throw new NotFoundError('Wallet not found');
    if (Number(w.balance) < amount) throw new BadRequestError('Insufficient balance');
    await tx.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } });
  });

  const session = {
    userId, gameId: game.id, seedId: seed.id,
    amount, grid, currentRow: 0, completedRows: 0, status: 'active',
  };

  await fastify.redis.set(`drill:${userId}`, JSON.stringify(session), 'EX', 3600);

  return { rows: ROWS, cols: COLS, goldPerRow: GOLD_PER_ROW, currentRow: 0, serverHash: seed.serverHash };
}

export async function pickCell(fastify, userId, { colIndex }) {
  const raw = await fastify.redis.get(`drill:${userId}`);
  if (!raw) throw new BadRequestError('No active Drill game');

  const session = JSON.parse(raw);
  if (session.status !== 'active') throw new BadRequestError('Game not active');
  if (colIndex < 0 || colIndex >= COLS) throw new BadRequestError('Invalid column');

  const rowItems = session.grid[session.currentRow];
  const item = rowItems[colIndex];

  if (item === 'rock') {
    session.status = 'lost';
    await fastify.redis.del(`drill:${userId}`);

    await fastify.prisma.$transaction(async (tx) => {
      const bet = await tx.bet.create({
        data: {
          userId, gameId: session.gameId, amount: session.amount,
          multiplier: 0, payout: 0, status: 'LOST',
          gameData: {}, resultData: { hitRock: true, row: session.currentRow, colIndex },
        },
      });
      await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Drill bet (lost)' } });
      await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
      await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
    });

    return { result: 'rock', bust: true, grid: session.grid, won: false, payout: 0 };
  }

  // Gold
  session.currentRow++;
  session.completedRows++;

  const multiplier = parseFloat((rowMultiplier(session.completedRows) * (1 - HOUSE_EDGE)).toFixed(4));
  const potentialPayout = parseFloat((session.amount * multiplier).toFixed(8));

  if (session.currentRow >= ROWS) {
    // Auto-win, all rows completed
    await fastify.redis.del(`drill:${userId}`);
    await _finishWin(fastify, userId, session, multiplier, potentialPayout);
    return { result: 'gold', won: true, autoWin: true, payout: potentialPayout, multiplier, grid: session.grid };
  }

  await fastify.redis.set(`drill:${userId}`, JSON.stringify(session), 'EX', 3600);
  return { result: 'gold', currentRow: session.currentRow, multiplier, potentialPayout };
}

export async function cashout(fastify, userId) {
  const raw = await fastify.redis.get(`drill:${userId}`);
  if (!raw) throw new BadRequestError('No active Drill game');

  const session = JSON.parse(raw);
  if (session.completedRows === 0) throw new BadRequestError('Complete at least one row first');

  const multiplier = parseFloat((rowMultiplier(session.completedRows) * (1 - HOUSE_EDGE)).toFixed(4));
  const payout = parseFloat((session.amount * multiplier).toFixed(8));

  await fastify.redis.del(`drill:${userId}`);
  await _finishWin(fastify, userId, session, multiplier, payout);

  return { won: true, payout, multiplier, grid: session.grid };
}

async function _finishWin(fastify, userId, session, multiplier, payout) {
  await fastify.prisma.$transaction(async (tx) => {
    const bet = await tx.bet.create({
      data: {
        userId, gameId: session.gameId, amount: session.amount,
        multiplier, payout, status: 'WON',
        gameData: { completedRows: session.completedRows },
        resultData: { grid: session.grid },
      },
    });
    await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
    await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Drill bet' } });
    await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'Drill win' } });
    await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
  });
  if (fastify.io) fastify.io.emit('bet:placed', { game: 'drill', amount: session.amount, multiplier, payout, won: true });
}
