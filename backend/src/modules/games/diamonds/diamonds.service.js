import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';

const HOUSE_EDGE = 0.01;
const DIAMOND_COLORS = ['purple', 'blue', 'yellow', 'red', 'cyan', 'green', 'orange'];

const PAYOUTS = {
  '5_kind':     50.00,
  '4_kind':     5.00,
  'full_house': 4.00,
  '3_kind':     3.00,
  '2_pair':     2.00,
  '1_pair':     0.10,
  'no_match':   0.00,
};

function generateDiamonds(serverSeed, clientSeed, nonce) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');
  const results = [];
  for (let i = 0; i < 5; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    results.push(DIAMOND_COLORS[byte % DIAMOND_COLORS.length]);
  }
  return results;
}

function evaluateHand(diamonds) {
  const counts = {};
  diamonds.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
  const freqs = Object.values(counts).sort((a, b) => b - a);
  if (freqs[0] === 5) return '5_kind';
  if (freqs[0] === 4) return '4_kind';
  if (freqs[0] === 3 && freqs[1] === 2) return 'full_house';
  if (freqs[0] === 3) return '3_kind';
  if (freqs[0] === 2 && freqs[1] === 2) return '2_pair';
  if (freqs[0] === 2) return '1_pair';
  return 'no_match';
}

export async function placeBet(fastify, userId, { amount }) {
  if (amount < 0) throw new BadRequestError('Bet amount cannot be negative');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'diamonds' } });
  if (!game || !game.isActive) throw new NotFoundError('Diamonds game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const diamonds = generateDiamonds(seed.serverSeed, seed.clientSeed, seed.nonce);
  const handId = evaluateHand(diamonds);
  const multiplier = PAYOUTS[handId] * (1 - HOUSE_EDGE);
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
        status: payout > amount ? 'WON' : (payout > 0 ? 'PARTIAL' : 'LOST'),
        gameData: { diamonds },
        resultData: { handId, multiplier },
      },
    });
    await tx.transaction.create({ data: { userId, amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Diamonds bet' } });
    if (payout > 0) {
      await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'Diamonds win' } });
    }
    await tx.provablyFairSeed.update({ where: { id: seed.id }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: game.id, userId, seedId: seed.id } });
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'diamonds', amount, multiplier, payout });
  return { diamonds, handId, multiplier, payout };
}
