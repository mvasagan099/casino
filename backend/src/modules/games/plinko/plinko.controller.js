import * as plinkoService from './plinko.service.js';

export async function placeBet(request, reply) {
  const { amount, risk, rows } = request.body;
  const result = await plinkoService.placeBet(request.server, request.user.id, { amount, risk, rows });
  reply.send({ success: true, data: result });
}
