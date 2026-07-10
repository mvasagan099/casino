import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';

export async function placeBet(fastify, userId, { amount, prediction, numCoins }) {
  if (amount < 0) throw new BadRequestError('Bet amount cannot be negative');
  if (!Array.isArray(prediction) || prediction.length !== numCoins) throw new BadRequestError('Prediction must match numCoins');
  if (numCoins < 1 || numCoins > 5) throw new BadRequestError('numCoins must be 1–5');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'flip' } });
  if (!game || !game.isActive) throw new NotFoundError('Flip game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  // Generate coin outcomes from seed
  const hmac = crypto.createHmac('sha256', seed.serverSeed);
  hmac.update(`${seed.clientSeed}:${seed.nonce}`);
  const hex = hmac.digest('hex');

  const outcomes = [];
  for (let i = 0; i < numCoins; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    outcomes.push(byte % 2 === 0 ? 'heads' : 'tails');
  }

  const won = outcomes.every((o, i) => o === prediction[i]);
  const multiplier = won ? parseFloat((0.98 * Math.pow(2, numCoins)).toFixed(4)) : 0;
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
        gameData: { prediction, numCoins },
        resultData: { outcomes, won },
      },
    });
    await tx.transaction.create({ data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Flip bet' } });
    if (payout > 0) {
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'Flip win' } });
    }
    await tx.provablyFairSeed.update({ where: { id: seed.id }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: game.id, userId, seedId: seed.id } });
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'flip', amount, multiplier, payout, won });
  return { outcomes, won, multiplier, payout };
}
