import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../../utils/errors.js';

const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createShuffledDeck(serverSeed, clientSeed, nonce) {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
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

function cardValue(rank) {
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}

function handTotal(hand) {
  let total = 0, aces = 0;
  for (const card of hand) {
    total += cardValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isBust(hand) { return handTotal(hand) > 21; }
function isBlackjack(hand) { return hand.length === 2 && handTotal(hand) === 21; }

export async function startGame(fastify, userId, { amount }) {
  if (amount < 0) throw new BadRequestError('Bet amount cannot be negative');

  const game = await fastify.prisma.game.findUnique({ where: { slug: 'blackjack' } });
  if (!game || !game.isActive) throw new NotFoundError('Blackjack game not available');
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

  const deck = createShuffledDeck(seed.serverSeed, seed.clientSeed, seed.nonce);
  const playerHand = [deck[0], deck[2]];
  const dealerHand = [deck[1], deck[3]];
  const deckIndex = 4;

  const sessionKey = `blackjack:${userId}`;
  const session = {
    userId, gameId: game.id, seedId: seed.id, amount,
    originalAmount: amount,
    deck, deckIndex, playerHand, dealerHand, status: 'active',
  };

  // Check immediate blackjack
  if (isBlackjack(playerHand)) {
    const multiplier = isBlackjack(dealerHand) ? 1.00 : 2.50; // Blackjack pays 3:2, tie pays 1:1
    const payout = parseFloat((amount * multiplier).toFixed(8));
    await fastify.redis.del(sessionKey);
    await _finalize(fastify, userId, session, multiplier, payout, isBlackjack(dealerHand) ? 'push' : 'blackjack', dealerHand);
    return {
      playerHand, dealerHand, playerTotal: 21, dealerTotal: handTotal(dealerHand),
      status: isBlackjack(dealerHand) ? 'push' : 'blackjack', payout, multiplier,
    };
  }

  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);
  return {
    playerHand, dealerHand: [dealerHand[0]], // hide second card
    playerTotal: handTotal(playerHand), dealerVisible: handTotal([dealerHand[0]]),
    status: 'active',
  };
}

export async function hit(fastify, userId) {
  const sessionKey = `blackjack:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Blackjack game');

  const session = JSON.parse(raw);
  if (session.status !== 'active') throw new BadRequestError('Game is not active');

  const newCard = session.deck[session.deckIndex++];
  session.playerHand.push(newCard);

  if (isBust(session.playerHand)) {
    session.status = 'bust';
    await fastify.redis.del(sessionKey);
    await _finalize(fastify, userId, session, 0, 0, 'bust', session.dealerHand);
    return { playerHand: session.playerHand, playerTotal: handTotal(session.playerHand), dealerHand: session.dealerHand, dealerTotal: handTotal(session.dealerHand), status: 'bust', payout: 0 };
  }

  await fastify.redis.set(sessionKey, JSON.stringify(session), 'EX', 3600);
  return { playerHand: session.playerHand, playerTotal: handTotal(session.playerHand), status: 'active' };
}

export async function stand(fastify, userId) {
  const sessionKey = `blackjack:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Blackjack game');

  const session = JSON.parse(raw);
  if (session.status !== 'active') throw new BadRequestError('Game is not active');

  // Dealer draws until 17+
  while (handTotal(session.dealerHand) < 17) {
    session.dealerHand.push(session.deck[session.deckIndex++]);
  }

  const playerTotal = handTotal(session.playerHand);
  const dealerTotal = handTotal(session.dealerHand);
  const dealerBust = isBust(session.dealerHand);

  let gameStatus, multiplier;
  if (dealerBust || playerTotal > dealerTotal) {
    gameStatus = 'win'; multiplier = 2.00;
  } else if (playerTotal === dealerTotal) {
    gameStatus = 'push'; multiplier = 1.00;
  } else {
    gameStatus = 'lose'; multiplier = 0;
  }

  const payout = parseFloat((session.amount * multiplier).toFixed(8));
  await fastify.redis.del(sessionKey);
  await _finalize(fastify, userId, session, multiplier, payout, gameStatus, session.dealerHand);
  return { playerHand: session.playerHand, playerTotal, dealerHand: session.dealerHand, dealerTotal, status: gameStatus, payout, multiplier };
}

export async function doubleDown(fastify, userId) {
  const sessionKey = `blackjack:${userId}`;
  const raw = await fastify.redis.get(sessionKey);
  if (!raw) throw new BadRequestError('No active Blackjack game');

  const session = JSON.parse(raw);
  if (session.status !== 'active') throw new BadRequestError('Game is not active');
  if (session.playerHand.length !== 2) throw new BadRequestError('Can only double on initial two cards');

  // Charge extra bet
  await fastify.prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (session.amount > 0 && Number(wallet.balance) < session.amount) throw new BadRequestError('Insufficient balance for double down');
    if (session.amount > 0) await tx.wallet.update({ where: { userId }, data: { balance: { decrement: session.amount } } });
  });

  session.amount = session.amount * 2;
  const newCard = session.deck[session.deckIndex++];
  session.playerHand.push(newCard);

  const playerTotal = handTotal(session.playerHand);

  if (isBust(session.playerHand)) {
    await fastify.redis.del(sessionKey);
    await _finalize(fastify, userId, session, 0, 0, 'bust', session.dealerHand);
    return { playerHand: session.playerHand, playerTotal, dealerHand: session.dealerHand, dealerTotal: handTotal(session.dealerHand), status: 'bust', payout: 0 };
  }

  // Auto stand
  while (handTotal(session.dealerHand) < 17) {
    session.dealerHand.push(session.deck[session.deckIndex++]);
  }

  const dealerTotal = handTotal(session.dealerHand);
  const dealerBust = isBust(session.dealerHand);
  let gameStatus, multiplier;
  if (dealerBust || playerTotal > dealerTotal) {
    gameStatus = 'win'; multiplier = 2.00;
  } else if (playerTotal === dealerTotal) {
    gameStatus = 'push'; multiplier = 1.00;
  } else {
    gameStatus = 'lose'; multiplier = 0;
  }

  const payout = parseFloat((session.amount * multiplier).toFixed(8));
  await fastify.redis.del(sessionKey);
  await _finalize(fastify, userId, session, multiplier, payout, gameStatus, session.dealerHand);
  return { playerHand: session.playerHand, playerTotal, dealerHand: session.dealerHand, dealerTotal, status: gameStatus, payout, multiplier };
}

async function _finalize(fastify, userId, session, multiplier, payout, gameStatus, dealerHand) {
  await fastify.prisma.$transaction(async (tx) => {
    const bet = await tx.bet.create({
      data: {
        userId, gameId: session.gameId, amount: session.amount, multiplier, payout,
        status: gameStatus === 'win' || gameStatus === 'blackjack' ? 'WON' : (gameStatus === 'push' ? 'PUSH' : 'LOST'),
        gameData: { playerHand: session.playerHand },
        resultData: { dealerHand, gameStatus },
      },
    });
    if (payout > 0) await tx.wallet.update({ where: { userId }, data: { balance: { increment: payout } } });
    await tx.transaction.create({ data: { userId, amount: session.amount, type: 'BET', status: 'COMPLETED', referenceId: bet.id, description: 'Blackjack bet' } });
    if (payout > 0) await tx.transaction.create({ data: { userId, amount: payout, type: 'WIN', status: 'COMPLETED', referenceId: bet.id, description: 'Blackjack win' } });
    await tx.provablyFairSeed.update({ where: { id: session.seedId }, data: { nonce: { increment: 1 } } });
    await tx.gameHistory.create({ data: { betId: bet.id, gameId: session.gameId, userId, seedId: session.seedId } });
  });
  if (fastify.io) fastify.io.emit('bet:placed', { game: 'blackjack', amount: session.amount, multiplier, payout, won: payout > 0 });
}
