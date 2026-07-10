import * as chickenService from './chicken.service.js';
export async function startGame(request, reply) {
  const { amount, difficulty } = request.body;
  const result = await chickenService.startGame(request.server, request.user.id, { amount, difficulty });
  reply.send({ success: true, data: result });
}
export async function jump(request, reply) {
  const result = await chickenService.jump(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
export async function cashout(request, reply) {
  const result = await chickenService.cashout(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
