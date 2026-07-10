import { BadRequestError, NotFoundError } from '../../../utils/errors.js';
import { generateResult, incrementNonce } from '../../provably-fair/provably-fair.service.js';

/**
 * Limbo game service.
 *
 * Rules:
 * - Player picks a target multiplier (e.g. 2.00)
 * - A crash point is generated using HMAC-SHA256(serverSeed, clientSeed:nonce)
 * - The house edge is 1%
 * - Player wins if the generated crash point is >= target multiplier.
 * - Payout = amount * target
 */

export async function placeBet(fastify, userId, { amount, target }) {
  if (amount < 0) throw new BadRequestError('Bet amount must be non-negative');
  if (target < 1.01) throw new BadRequestError('Target multiplier must be at least 1.01');
  if (target > 1000000) throw new BadRequestError('Target multiplier cannot exceed 1,000,000');

  // Get the game record
  const game = await fastify.prisma.game.findUnique({ where: { slug: 'limbo' } });
  if (!game || !game.isActive) throw new NotFoundError('Limbo game not available');

  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  // Get active seed
  const seed = await fastify.prisma.provablyFairSeed.findFirst({
    where: { userId, isActive: true },
  });
  if (!seed) throw new NotFoundError('No active seed pair found');

  // Generate crash point
  const result_0_100 = generateResult(seed.serverSeed, seed.clientSeed, seed.nonce);
  const rand = result_0_100 / 100; // 0.0 to 1.0
  const rawMultiplier = rand === 0 ? 1000000 : 0.99 / rand;
  const finalCrashPoint = Math.min(Math.max(1.00, rawMultiplier), 1000000);
  const roundedCrashPoint = Math.floor(finalCrashPoint * 100) / 100;

  const won = roundedCrashPoint >= target;
  const payout = won ? parseFloat((amount * target).toFixed(8)) : 0;
  const profit = payout - amount;

  // Execute bet atomically
  const bet = await fastify.prisma.$transaction(async (tx) => {
    if (amount > 0) {
      // 1. Check and deduct balance
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundError('Wallet not found');
      if (Number(wallet.balance) < amount) throw new BadRequestError('Insufficient balance');

      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      });
    }

    // 2. Record the bet
    const newBet = await tx.bet.create({
      data: {
        userId,
        gameId: game.id,
        amount,
        multiplier: target,
        payout,
        status: won ? 'WON' : 'LOST',
        gameData: { target },
        resultData: { result: roundedCrashPoint, won },
      },
    });

    // 3. Increment nonce
    await incrementNonce(tx, seed.id);

    if (amount > 0) {
      // 4. Record transactions
      await tx.transaction.create({
        data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: newBet.id, description: 'Limbo bet' },
      });

      // 5. Credit winnings if won
      if (won && payout > 0) {
        await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
        await tx.transaction.create({
          data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: newBet.id, description: 'Limbo win' },
        });
      }
    }

    // 6. Link game history
    await tx.gameHistory.create({
      data: { betId: newBet.id, gameId: game.id, userId, seedId: seed.id },
    });

    return newBet;
  });

  const response = {
    betId: bet.id,
    result: roundedCrashPoint,
    target,
    won,
    amount,
    multiplier: target,
    payout,
    profit,
  };

  // Emit live bet event over Socket.IO
  if (fastify.io && amount > 0) {
    fastify.io.emit('bet:placed', {
      game: 'limbo',
      username: null,
      amount,
      multiplier: target,
      payout,
      won,
    });
  }

  return response;
}
