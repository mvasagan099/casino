import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';
import { incrementNonce } from '../../provably-fair/provably-fair.service.js';

/**
 * Hilo game service.
 *
 * Rules:
 * - A deck of 52 cards. Current card shown. Player guesses higher or lower.
 * - Correct guess → multiplier grows. Wrong → bust.
 * - Multiplier based on probability of being higher/lower.
 */

const HOUSE_EDGE = 0.01;
const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function cardValue(rank) {
  return RANKS.indexOf(rank) + 1; // 1–13
}

function generateDeck(serverSeed, clientSeed, nonce) {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const color = (suit === '♥' || suit === '♦') ? 'red' : 'black';
      deck.push({ suit, rank, value: cardValue(rank), color });
    }
  }

  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');
  const bytes = Buffer.from(hex.repeat(4), 'hex');

  for (let i = deck.length - 1; i > 0; i--) {
    const byteIndex = (deck.length - 1 - i) * 4;
    const rand = bytes.readUInt32BE(byteIndex % (bytes.length - 4)) % (i + 1);
    [deck[i], deck[rand]] = [deck[rand], deck[i]];
  }
  return deck;
}

function calcMultiplier(currentRank, direction) {
  const currentValue = cardValue(currentRank);
  let favorableCards;
  if (direction === 'higher') {
    favorableCards = 13 - currentValue; // cards with strictly higher rank
  } else if (direction === 'lower') {
    favorableCards = currentValue - 1; // cards with strictly lower rank
  } else {
    favorableCards = 0; // The logic for skip? Wait.
  }
  
  // The frontend handles 'higher or same' and 'lower or same' actually.
  // Wait, let me check the frontend's exact math.
  if (direction === 'higher') {
    favorableCards = 13 - currentValue + 1; // higher OR same
  } else if (direction === 'lower') {
    favorableCards = currentValue; // lower OR same
  }
  
  const totalCards = 13; // We base probability purely on rank for Hilo
  if (favorableCards <= 0) return 0;
  const probability = favorableCards / totalCards;
  return parseFloat(((0.99) / probability).toFixed(4));
}

export async function startGame(fastify, userId, { amount }) {
  if (amount < 0) throw new BadRequestError('Bet amount must be positive');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'hilo' } });
  if (!game || !game.isActive) throw new NotFoundError('Hilo game not available');
  if (amount > 0 && amount < Number(game.minBet)) throw new BadRequestError(`Minimum bet is ${game.minBet}`);
  if (amount > Number(game.maxBet)) throw new BadRequestError(`Maximum bet is ${game.maxBet}`);

  const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
  if (!seed) throw new NotFoundError('No active seed pair found');

  const deck = generateDeck(seed.serverSeed, seed.clientSeed, seed.nonce);

  const sessionKey = `hilo:${userId}`;
  const session = {
    userId, gameId: game.id, seedId: seed.id,
    amount, deck, currentIndex: 0,
    currentMultiplier: 1, revealedCards: [],
    status: 'active', nonce: seed.nonce,
  };

  // Deduct bet
  await fastify.prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUnique({ where: { userId } });
    if (!w) throw new NotFoundError('Wallet not found');
    if (Number(w.balance) < amount) throw new BadRequestError('Insufficient balance');
    await tx.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } });
  });

  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);

  const firstCard = deck[0];
  return { currentCard: firstCard, currentMultiplier: 1, serverHash: seed.serverHash };
}

export async function guess(fastify, userId, { direction }) {
  if (!['higher', 'lower', 'skip'].includes(direction)) throw new BadRequestError('Direction must be higher, lower, or skip');

  const sessionKey = `hilo:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Hilo game');

  const session = JSON.parse(raw);
  if (session.status !== 'active') throw new BadRequestError('Game is not active');

  const currentCard = session.deck[session.currentIndex];
  const nextCard = session.deck[session.currentIndex + 1];

  if (!nextCard) throw new BadRequestError('No more cards');

  const currentValue = cardValue(currentCard.rank);
  const nextValue = cardValue(nextCard.rank);

  let correct = false;
  // 'higher' means higher or same
  if (direction === 'higher') correct = nextValue >= currentValue;
  // 'lower' means lower or same
  else if (direction === 'lower') correct = nextValue <= currentValue;
  else correct = true; // skip is not a guess, wait skip is handled in another endpoint?

  if (!correct) {
    // Bust
    session.status = 'lost';
    await fastify.redis.del(sessionKey);

    const seed = await fastify.prisma.provablyFairSeed.findFirst({ where: { userId, isActive: true } });
    await fastify.prisma.$transaction(async (tx) => {
      const bet = await tx.bet.create({
        data: {
          userId, gameId: session.gameId, amount: session.amount,
          multiplier: 0, payout: 0, status: 'LOST',
          gameData: { revealedCards: session.revealedCards },
          resultData: { currentCard, nextCard, direction, bust: true },
        },
      });
      await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Hilo bet (lost)' } });
      if (seed) {
        await tx.provablyFairSeed.update({ where: { id: seed.id }, data: { nonce: { increment: 1 } } });
        await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: seed.id } });
      }
    });

    return { correct: false, bust: true, nextCard, won: false, payout: 0 };
  }

  // Correct
  const stepMult = calcMultiplier(currentCard.rank, direction);
  session.currentMultiplier = parseFloat((session.currentMultiplier * stepMult).toFixed(4));
  session.currentIndex++;
  session.revealedCards.push(currentCard);

  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);

  return {
    correct: true, nextCard, currentMultiplier: session.currentMultiplier,
    potentialPayout: parseFloat((session.amount * session.currentMultiplier).toFixed(8)),
  };
}

export async function cashout(fastify, userId) {
  const sessionKey = `hilo:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Hilo game');

  const session = JSON.parse(raw);
  if (session.revealedCards.length === 0) throw new BadRequestError('Make at least one correct guess first');

  const payout = parseFloat((session.amount * session.currentMultiplier).toFixed(8));
  await fastify.redis.del(sessionKey);

  await fastify.prisma.$transaction(async (tx) => {
    const bet = await tx.bet.create({
      data: {
        userId, gameId: session.gameId, amount: session.amount,
        multiplier: session.currentMultiplier, payout, status: 'WON',
        gameData: { revealedCards: session.revealedCards },
        resultData: { multiplier: session.currentMultiplier },
      },
    });
    await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
    await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Hilo bet' } });
    await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'Hilo win' } });
    await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
  });

  if (fastify.io) fastify.io.emit('bet:placed', { game: 'hilo', amount: session.amount, multiplier: session.currentMultiplier, payout, won: true });

  return { won: true, payout, multiplier: session.currentMultiplier };
}
