import * as molesService from './moles.service.js';
export async function startGame(request, reply) {
  const { amount, numMoles } = request.body;
  const result = await molesService.startGame(request.server, request.user.id, { amount, numMoles });
  reply.send({ success: true, data: result });
}
export async function pick(request, reply) {
  const { holeIndex } = request.body;
  const result = await molesService.pick(request.server, request.user.id, { holeIndex });
  reply.send({ success: true, data: result });
}
export async function cashout(request, reply) {
  const result = await molesService.cashout(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
