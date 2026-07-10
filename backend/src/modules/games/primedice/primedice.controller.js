import * as primediceService from './primedice.service.js';
export async function placeBet(request, reply) {
  const { amount, minVal, maxVal } = request.body;
  const result = await primediceService.placeBet(request.server, request.user.id, { amount, minVal, maxVal });
  reply.send({ success: true, data: result });
}
