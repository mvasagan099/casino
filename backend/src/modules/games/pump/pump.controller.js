import * as pumpService from './pump.service.js';
export async function startGame(request, reply) {
  const { amount, difficulty } = request.body;
  const result = await pumpService.startGame(request.server, request.user.id, { amount, difficulty });
  reply.send({ success: true, data: result });
}
export async function pump(request, reply) {
  const result = await pumpService.pump(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
export async function cashout(request, reply) {
  const result = await pumpService.cashout(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
