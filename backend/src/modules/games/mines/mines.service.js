import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';

/**
 * Mines game service.
 *
 * Rules:
 * - Player picks a number of mines (1–24) on a 5×5 grid (25 tiles)
 * - On each reveal, if it's a mine → bust. If safe → multiplier increases.
 * - Multiplier uses a combinatorial formula:
 *   M = (C(25, safeTiles) / C(25 - mines, safeTiles)) * (1 - houseEdge)
 * - Server generates mine positions from the seed before the game starts.
 */

const HOUSE_EDGE = 0.01;
const GRID_SIZE = 25;

/**
 * Calculate payout multiplier given mines count and number of safe reveals.
 */
function calcMultiplier(minesCount, reveals) {
  if (reveals === 0) return 1;
  let num = 1;
  let den = 1;
  for (let i = 0; i < reveals; i++) {
    num *= GRID_SIZE - minesCount - i;
    den *= GRID_SIZE - i;
  }
  const probability = num / den;
  return parseFloat(((1 - HOUSE_EDGE) / probability).toFixed(4));
}

/**
 * Generate mine positions deterministically from the seed.
 */
function generateMinePositions(serverSeed, clientSeed, nonce, minesCount) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');

  const positions = Array.from({ length: GRID_SIZE }, (_, i) => i);
  // Fisher-Yates shuffle using seed bytes
  const bytes = Buffer.from(hex.repeat(3), 'hex'); // enough bytes
  for (let i = positions.length - 1; i > 0; i--) {
    const byteIndex = (positions.length - 1 - i) * 4;
    const rand = bytes.readUInt32BE(byteIndex % (bytes.length - 4)) % (i + 1);
    [positions[i], positions[rand]] = [positions[rand], positions[i]];
  }

  return positions.slice(0, minesCount).sort((a, b) => a - b);
}

/**
 * Start a new Mines game session.
 */
export async function startGame(fastify, userId, { amount, minesCount }) {
  if (amount < 0) throw new BadRequestError('Bet amount must be positive');
  if (minesCount < 1 || minesCount > 24) throw new BadRequestError('Mines count must be 1–24');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'mines' } });
  if (!game || !game.isActive) throw new NotFoundError('Mines game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const minePositions = generateMinePositions(seed.serverSeed, seed.clientSeed, seed.nonce, minesCount);

  // Deduct bet amount atomically
  const wallet = await fastify.prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUnique({ where: { userId } });
    if (!w) throw new NotFoundError('Wallet not found');
    if (Number(w.balance) < amount) throw new BadRequestError('Insufficient balance');
    return tx.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } });
  });

  // Store game state in Redis (session)
  const sessionKey = `mines:${userId}`;
  const session = {
    userId,
    gameId: game.id,
    seedId: seed.id,
    amount,
    minesCount,
    minePositions,
    revealedSafe: [],
    status: 'active',
    nonce: seed.nonce,
    clientSeed: seed.clientSeed,
    serverHash: seed.serverHash,
  };
  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600); // 1 hour TTL

  return {
    minesCount,
    gridSize: GRID_SIZE,
    multiplier: calcMultiplier(minesCount, 0),
    serverHash: seed.serverHash,
    clientSeed: seed.clientSeed,
    nonce: seed.nonce,
  };
}

/**
 * Reveal a tile in the current Mines session.
 */
export async function revealTile(fastify, userId, { tileIndex }) {
  if (tileIndex < 0 || tileIndex >= GRID_SIZE) throw new BadRequestError('Invalid tile index');

  const sessionKey = `mines:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Mines game. Please start a new game.');

  const session = JSON.parse(raw);
  if (session.status !== 'active') throw new BadRequestError('Game is not active');
  if (session.revealedSafe.includes(tileIndex)) throw new BadRequestError('Tile already revealed');

  const isMine = session.minePositions.includes(tileIndex);

  if (isMine) {
    // Player hit a mine — bust
    session.status = 'lost';
    await fastify.redis.del(sessionKey);

    // Record lost bet in DB
    const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
    await fastify.prisma.$transaction(async (tx) => {
      const bet = await tx.bet.create({
        data: {
          userId,
          gameId: session.gameId,
          amount: session.amount,
          multiplier: 0,
          payout: 0,
          status: 'LOST',
          gameData: { minesCount: session.minesCount, revealedSafe: session.revealedSafe },
          resultData: { hitMine: tileIndex, minePositions: session.minePositions },
        },
      });
      await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Mines bet (lost)' } });
      if (seed) {
        await tx.provablyFairSeed.update({ where: { id: seed.id }, data: { nonce: { increment: 1 } } });
        await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: seed.id } });
      }
    });

    return { isMine: true, bust: true, minePositions: session.minePositions, won: false, payout: 0 };
  }

  // Safe tile
  session.revealedSafe.push(tileIndex);
  const multiplier = calcMultiplier(session.minesCount, session.revealedSafe.length);
  const potentialPayout = parseFloat((session.amount * multiplier).toFixed(8));

  // Check if all safe tiles revealed
  const safeTiles = GRID_SIZE - session.minesCount;
  const autoWin = session.revealedSafe.length >= safeTiles;

  if (autoWin) {
    // Auto-cashout
    await fastify.redis.del(sessionKey);
    await _cashout(fastify, userId, session, multiplier, potentialPayout);
    return { isMine: false, tileIndex, multiplier, payout: potentialPayout, won: true, autoWin: true, minePositions: session.minePositions };
  }

  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);
  return { isMine: false, tileIndex, multiplier, potentialPayout, revealedSafe: session.revealedSafe, won: false };
}

/**
 * Cash out the current Mines session.
 */
export async function cashout(fastify, userId) {
  const sessionKey = `mines:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Mines game');

  const session = JSON.parse(raw);
  if (session.status !== 'active') throw new BadRequestError('Game is not active');
  if (session.revealedSafe.length === 0) throw new BadRequestError('Reveal at least one tile before cashing out');

  const multiplier = calcMultiplier(session.minesCount, session.revealedSafe.length);
  const payout = parseFloat((session.amount * multiplier).toFixed(8));

  await fastify.redis.del(sessionKey);
  await _cashout(fastify, userId, session, multiplier, payout);

  return { won: true, payout, multiplier, minePositions: session.minePositions };
}

async function _cashout(fastify, userId, session, multiplier, payout) {
  await fastify.prisma.$transaction(async (tx) => {
    const bet = await tx.bet.create({
      data: {
        userId,
        gameId: session.gameId,
        amount: session.amount,
        multiplier,
        payout,
        status: 'WON',
        gameData: { minesCount: session.minesCount },
        resultData: { revealedSafe: session.revealedSafe, minePositions: session.minePositions },
      },
    });
    await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
    await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Mines bet' } });
    await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'Mines win' } });
    await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
  });

  if (fastify.io) {
    fastify.io.emit('bet:placed', { game: 'mines', amount: session.amount, multiplier, payout, won: true });
  }
}
