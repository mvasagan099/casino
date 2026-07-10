import * as crashService from './crash.service.js';

export async function placeBet(request, reply) {
  const { amount, cashoutAt } = request.body;
  const result = await crashService.placeBet(request.server, request.user.id, { amount, cashoutAt });
  reply.send({ success: true, data: result });
}
