import * as flipService from './flip.service.js';
export async function placeBet(request, reply) {
  const { amount, prediction, numCoins } = request.body;
  const result = await flipService.placeBet(request.server, request.user.id, { amount, prediction, numCoins });
  reply.send({ success: true, data: result });
}
