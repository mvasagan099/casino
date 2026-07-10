import * as wheelService from './wheel.service.js';
export async function placeBet(request, reply) {
  const { amount, risk } = request.body;
  const result = await wheelService.placeBet(request.server, request.user.id, { amount, risk });
  reply.send({ success: true, data: result });
}
