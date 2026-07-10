import { BadRequestError, NotFoundError } from '../../utils/errors.js';

/**
 * Wallet service — all balance mutations use Prisma interactive transactions.
 */

/**
 * Get wallet balance for a user.
 */
export async function getBalance(fastify, userId) {
  const wallet = await fastify.prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new NotFoundError('Wallet not found');
  return wallet;
}

/**
 * Deposit funds into a user's wallet.
 */
export async function deposit(fastify, userId, { amount, description }) {
  if (amount <= 0) throw new BadRequestError('Amount must be positive');

  return fastify.prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    await tx.transaction.create({
      data: {
        userId,
        amount,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        description: description || 'Deposit',
      },
    });

    return wallet;
  });
}

/**
 * Withdraw funds from a user's wallet.
 */
export async function withdraw(fastify, userId, { amount, description }) {
  if (amount <= 0) throw new BadRequestError('Amount must be positive');

  return fastify.prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');

    if (Number(wallet.balance) < amount) {
      throw new BadRequestError('Insufficient balance');
    }

    const updated = await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });

    await tx.transaction.create({
      data: {
        userId,
        amount,
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        description: description || 'Withdrawal',
      },
    });

    return updated;
  });
}

/**
 * Get paginated transaction history.
 */
export async function getTransactions(fastify, userId, { page = 1, limit = 20, type } = {}) {
  const skip = (page - 1) * limit;
  const where = { userId, ...(type ? { type } : {}) };

  const [transactions, total] = await Promise.all([
    fastify.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    fastify.prisma.transaction.count({ where }),
  ]);

  return { transactions, total, page, limit, pages: Math.ceil(total / limit) };
}

/**
 * Credit a bonus to a user's wallet.
 */
export async function applyBonus(fastify, userId, { amount, description }) {
  if (amount <= 0) throw new BadRequestError('Amount must be positive');

  return fastify.prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    await tx.transaction.create({
      data: {
        userId,
        amount,
        type: 'BONUS',
        status: 'COMPLETED',
        description: description || 'Bonus credit',
      },
    });

    return wallet;
  });
}

/**
 * Lock funds from wallet into vault.
 */
export async function lockToVault(fastify, userId, { amount }) {
  if (amount <= 0) throw new BadRequestError('Amount must be positive');

  return fastify.prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (Number(wallet.balance) < amount) throw new BadRequestError('Insufficient balance');

    return tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount }, vaultBalance: { increment: amount } },
    });
  });
}

/**
 * Unlock funds from vault back into wallet.
 */
export async function unlockFromVault(fastify, userId, { amount }) {
  if (amount <= 0) throw new BadRequestError('Amount must be positive');

  return fastify.prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (Number(wallet.vaultBalance) < amount) throw new BadRequestError('Insufficient vault balance');

    return tx.wallet.update({
      where: { userId },
      data: { vaultBalance: { decrement: amount }, balance: { increment: amount } },
    });
  });
}
