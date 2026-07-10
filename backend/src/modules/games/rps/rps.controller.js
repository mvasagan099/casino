import * as rpsService from './rps.service.js';
export async function startGame(request, reply) {
  const { amount } = request.body;
  const result = await rpsService.startGame(request.server, request.user.id, { amount });
  reply.send({ success: true, data: result });
}
export async function move(request, reply) {
  const { playerMove } = request.body;
  const result = await rpsService.move(request.server, request.user.id, { playerMove });
  reply.send({ success: true, data: result });
}
export async function cashout(request, reply) {
  const result = await rpsService.cashout(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
