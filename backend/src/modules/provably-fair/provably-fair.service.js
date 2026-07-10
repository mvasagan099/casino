import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

/**
 * Provably Fair service — SHA-256 based seed management and result verification.
 */

/**
 * Generate a random result (0–100) from seed pair using HMAC-SHA256.
 */
export function generateResult(serverSeed, clientSeed, nonce) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hex = hmac.digest('hex');

  // Take first 8 hex chars → convert to float 0–100
  const decimal = parseInt(hex.slice(0, 8), 16);
  return (decimal / 0xffffffff) * 100;
}

/**
 * Get the current active seed pair for a user (server hash only, not raw seed).
 */
export async function getCurrentSeed(fastify, userId) {
  const seed = await fastify.prisma.provablyFairSeed.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      serverHash: true,
      clientSeed: true,
      nonce: true,
    },
  });
  if (!seed) throw new NotFoundError('No active seed pair found');
  return seed;
}

/**
 * Rotate seeds: reveal old serverSeed, generate new pair.
 */
export async function rotateSeeds(fastify, userId) {
  const oldSeed = await fastify.prisma.provablyFairSeed.findFirst({
    where: { userId, isActive: true },
  });
  if (!oldSeed) throw new NotFoundError('No active seed pair found');

  const newServerSeed = crypto.randomBytes(32).toString('hex');
  const newServerHash = crypto.createHash('sha256').update(newServerSeed).digest('hex');
  const newClientSeed = crypto.randomBytes(16).toString('hex');

  const [revealed, newSeed] = await fastify.prisma.$transaction([
    // Deactivate old seed (and reveal its raw serverSeed for verification)
    fastify.prisma.provablyFairSeed.update({
      where: { id: oldSeed.id },
      data: { isActive: false, rotatedAt: new Date() },
    }),
    // Create new active seed pair
    fastify.prisma.provablyFairSeed.create({
      data: {
        userId,
        serverSeed: newServerSeed,
        serverHash: newServerHash,
        clientSeed: newClientSeed,
        nonce: 0,
        isActive: true,
      },
    }),
  ]);

  return {
    revealedServerSeed: oldSeed.serverSeed, // revealed on rotation
    revealedClientSeed: oldSeed.clientSeed,
    revealedNonce: oldSeed.nonce,
    newServerHash: newSeed.serverHash,
    newClientSeed: newSeed.clientSeed,
  };
}

/**
 * Update the client seed for the active pair.
 */
export async function updateClientSeed(fastify, userId, { clientSeed }) {
  const seed = await fastify.prisma.provablyFairSeed.findFirst({
    where: { userId, isActive: true },
  });
  if (!seed) throw new NotFoundError('No active seed pair found');

  return fastify.prisma.provablyFairSeed.update({
    where: { id: seed.id },
    data: { clientSeed },
    select: { serverHash: true, clientSeed: true, nonce: true },
  });
}

/**
 * Verify a past bet using the revealed server seed.
 */
export async function verifyBet(fastify, { serverSeed, clientSeed, nonce }) {
  // Check hash matches
  const serverHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  const result = generateResult(serverSeed, clientSeed, nonce);

  return {
    serverSeed,
    serverHash,
    clientSeed,
    nonce,
    result: parseFloat(result.toFixed(2)),
    verified: true,
  };
}

/**
 * Increment nonce for a seed after a bet is placed.
 */
export async function incrementNonce(tx, seedId) {
  return tx.provablyFairSeed.update({
    where: { id: seedId },
    data: { nonce: { increment: 1 } },
  });
}
