import * as diamondsService from './diamonds.service.js';
export async function placeBet(request, reply) {
  const { amount } = request.body;
  const result = await diamondsService.placeBet(request.server, request.user.id, { amount });
  reply.send({ success: true, data: result });
}
