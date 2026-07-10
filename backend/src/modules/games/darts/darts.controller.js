import * as dartsService from './darts.service.js';
export async function placeBet(request, reply) {
  const { amount, difficulty } = request.body;
  const result = await dartsService.placeBet(request.server, request.user.id, { amount, difficulty });
  reply.send({ success: true, data: result });
}
