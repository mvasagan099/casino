import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';

function generateCrashPoint(serverSeed, clientSeed, nonce) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');
  const h = parseInt(hex.slice(0, 8), 16);
  if (h % 33 === 0) return 1.00; // instant crash ~3% of the time
  return Math.max(1.00, parseFloat((0.98 / (1 - h / 0xffffffff)).toFixed(2)));
}

export async function placeBet(fastify, userId, { amount, targetMultiplier }) {
  if (amount < 0) throw new BadRequestError('Bet amount cannot be negative');
  if (targetMultiplier < 1.01) throw new BadRequestError('Target multiplier must be >= 1.01');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'slide' } });
  if (!game || !game.isActive) throw new NotFoundError('Slide game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const crashPoint = generateCrashPoint(seed.serverSeed, seed.clientSeed, seed.nonce);
  const won = crashPoint >= targetMultiplier;
  const multiplier = won ? targetMultiplier : 0;
  const payout = parseFloat((amount * multiplier).toFixed(8));

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
        status: won ? 'WON' : 'LOST',
        gameData: { targetMultiplier },
        resultData: { crashPoint, won },
      },
    });
    await tx.transaction.create({ data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Slide bet' } });
    if (payout > 0) {
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'Slide win' } });
    }
    await tx.provablyFairSeed.update({ where: { id: seed.id }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: game.id, userId, seedId: seed.id } });
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'slide', amount, multiplier: crashPoint, payout, won });
  return { crashPoint, won, multiplier, payout };
}
