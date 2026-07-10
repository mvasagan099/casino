import * as diceService from './dice.service.js';

export async function placeBet(request, reply) {
  const { amount, target, direction } = request.body;
  const result = await diceService.placeBet(request.server, request.user.id, { amount, target, direction });
  reply.send({ success: true, data: result });
}
