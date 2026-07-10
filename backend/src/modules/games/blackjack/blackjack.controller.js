import * as blackjackService from './blackjack.service.js';
export async function startGame(request, reply) {
  const { amount } = request.body;
  const result = await blackjackService.startGame(request.server, request.user.id, { amount });
  reply.send({ success: true, data: result });
}
export async function hit(request, reply) {
  const result = await blackjackService.hit(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
export async function stand(request, reply) {
  const result = await blackjackService.stand(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
export async function doubleDown(request, reply) {
  const result = await blackjackService.doubleDown(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
