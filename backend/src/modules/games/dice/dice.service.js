import { BadRequestError, NotFoundError } from '../../../utils/errors.js';
import { generateResult, incrementNonce } from '../../provably-fair/provably-fair.service.js';

/**
 * Dice game service.
 *
 * Rules:
 * - Player picks a target (1–98) and direction (over | under)
 * - A result 0–100 is generated using HMAC-SHA256(serverSeed, clientSeed:nonce)
 * - over: win if result > target
 * - under: win if result < target
 * - Payout multiplier = 99 / (100 - target) for "over", 99 / target for "under"
 */

const HOUSE_EDGE = 0.01; // 1%

function calcMultiplier(target, direction) {
  const winChance = direction === 'over' ? (100 - target) : target;
  if (winChance <= 0 || winChance >= 100) throw new BadRequestError('Invalid target for direction');
  return parseFloat(((1 - HOUSE_EDGE) * (100 / winChance)).toFixed(4));
}

export async function placeBet(fastify, userId, { amount, target, direction }) {
  if (amount < 0) throw new BadRequestError('Bet amount must be positive');
  if (target < 1 || target > 98) throw new BadRequestError('Target must be between 1 and 98');
  if (!['over', 'under'].includes(direction)) throw new BadRequestError('Direction must be over or under');

  // Get the game record
  const game = await fastify.prisma.game.findUnique({ where: { slug: 'dice' } });
  if (!game || !game.isActive) throw new NotFoundError('Dice game not available');

  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  // Get active seed
  const seed = await fastify.prisma.provablyFairSeed.findFirst({
    where: { userId, isActive: true },
  });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const result = generateResult(seed.serverSeed, seed.clientSeed, seed.nonce);
  const roundedResult = parseFloat(result.toFixed(2));
  const multiplier = calcMultiplier(target, direction);

  const won =
    (direction === 'over' && roundedResult > target) ||
    (direction === 'under' && roundedResult < target);

  const payout = won ? parseFloat((amount * multiplier).toFixed(8)) : 0;
  const profit = payout - amount;

  // Execute bet atomically
  const bet = await fastify.prisma.$transaction(async (tx) => {
    // 1. Check and deduct balance
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (Number(wallet.balance) < amount) throw new BadRequestError('Insufficient balance');

    await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });

    // 2. Record the bet
    const newBet = await tx.bet.create({
      data: {
        userId,
        gameId: game.id,
        amount,
        multiplier,
        payout,
        status: won ? 'WON' : 'LOST',
        gameData: { target, direction },
        resultData: { result: roundedResult, won },
      },
    });

    // 3. Increment nonce
    await incrementNonce(tx, seed.id);

    // 4. Record transactions
    await tx.transaction.create({
      data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: newBet.id, description: 'Dice bet' },
    });

    // 5. Credit winnings if won
    if (won) {
      await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
      await tx.transaction.create({
        data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: newBet.id, description: 'Dice win' },
      });
    }

    // 6. Link game history
    await tx.gameHistory.create({
      data: { betId: newBet.id, gameId: game.id, userId, seedId: seed.id },
    });

    return newBet;
  });

  const response = {
    betId: bet.id,
    result: roundedResult,
    target,
    direction,
    won,
    amount,
    multiplier,
    payout,
    profit,
  };

  // Emit live bet event over Socket.IO
  if (fastify.io) {
    fastify.io.emit('bet:placed', {
      game: 'dice',
      username: null, // fetched separately if needed
      amount,
      multiplier,
      payout,
      won,
    });
  }

  return response;
}
