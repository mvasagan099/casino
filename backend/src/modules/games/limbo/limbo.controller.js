import * as limboService from './limbo.service.js';

export async function placeBet(req, reply) {
  const userId = req.user.id;
  const { amount, target } = req.body;

  const result = await limboService.placeBet(req.server, userId, {
    amount: Number(amount),
    target: Number(target),
  });

  return { success: true, data: result };
}
