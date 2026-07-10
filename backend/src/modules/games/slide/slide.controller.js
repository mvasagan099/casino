import * as slideService from './slide.service.js';
export async function placeBet(request, reply) {
  const { amount, targetMultiplier } = request.body;
  const result = await slideService.placeBet(request.server, request.user.id, { amount, targetMultiplier });
  reply.send({ success: true, data: result });
}
