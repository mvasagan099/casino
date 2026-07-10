import * as walletService from './wallet.service.js';

export async function getBalance(request, reply) {
  const wallet = await walletService.getBalance(request.server, request.user.id);
  reply.send({ success: true, data: wallet });
}

export async function deposit(request, reply) {
  const { amount, description } = request.body;
  const wallet = await walletService.deposit(request.server, request.user.id, { amount, description });
  reply.send({ success: true, data: wallet });
}

export async function withdraw(request, reply) {
  const { amount, description } = request.body;
  const wallet = await walletService.withdraw(request.server, request.user.id, { amount, description });
  reply.send({ success: true, data: wallet });
}

export async function getTransactions(request, reply) {
  const { page, limit, type } = request.query;
  const result = await walletService.getTransactions(request.server, request.user.id, {
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    type,
  });
  reply.send({ success: true, data: result });
}

export async function applyBonus(request, reply) {
  const { amount, description } = request.body;
  const wallet = await walletService.applyBonus(request.server, request.user.id, { amount, description });
  reply.send({ success: true, data: wallet });
}

export async function lockToVault(request, reply) {
  const { amount } = request.body;
  const wallet = await walletService.lockToVault(request.server, request.user.id, { amount });
  reply.send({ success: true, data: wallet });
}

export async function unlockFromVault(request, reply) {
  const { amount } = request.body;
  const wallet = await walletService.unlockFromVault(request.server, request.user.id, { amount });
  reply.send({ success: true, data: wallet });
}
