import * as barsService from './bars.service.js';
export async function placeBet(request, reply) {
  const { amount, difficulty, tiles } = request.body;
  const result = await barsService.placeBet(request.server, request.user.id, { amount, difficulty, tiles });
  reply.send({ success: true, data: result });
}
