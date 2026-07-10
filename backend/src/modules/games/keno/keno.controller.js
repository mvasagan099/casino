import * as kenoService from './keno.service.js';
export async function placeBet(request, reply) {
  const { amount, picks } = request.body;
  const result = await kenoService.placeBet(request.server, request.user.id, { amount, picks });
  reply.send({ success: true, data: result });
}
