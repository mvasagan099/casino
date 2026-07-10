import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';

export async function placeBet(fastify, userId, { amount, minVal, maxVal }) {
  if (amount < 0) throw new BadRequestError('Bet amount cannot be negative');
  if (minVal < 0 || maxVal > 100 || minVal >= maxVal) throw new BadRequestError('Invalid range');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'primedice' } });
  if (!game || !game.isActive) throw new NotFoundError('PrimeDice game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const hmac = crypto.createHmac('sha256', seed.serverSeed);
  hmac.update(`${seed.clientSeed}:${seed.nonce}`);
  const hex = hmac.digest('hex');
  const roll = parseFloat(((parseInt(hex.slice(0, 8), 16) / 0xffffffff) * 100).toFixed(2));

  const won = roll >= minVal && roll <= maxVal;
  const winChance = Math.max(0.01, maxVal - minVal);
  const multiplier = won ? parseFloat((99 / winChance).toFixed(4)) : 0;
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
        gameData: { minVal, maxVal },
        resultData: { roll, won },
      },
    });
    await tx.transaction.create({ data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'PrimeDice bet' } });
    if (payout > 0) {
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'PrimeDice win' } });
    }
    await tx.provablyFairSeed.update({ where: { id: seed.id }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: game.id, userId, seedId: seed.id } });
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'primedice', amount, multiplier, payout, won });
  return { roll, won, multiplier, payout };
}
