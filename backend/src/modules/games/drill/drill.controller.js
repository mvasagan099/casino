import * as drillService from './drill.service.js';
export async function startGame(request, reply) {
  const result = await drillService.startGame(request.server, request.user.id, request.body);
  reply.send({ success: true, data: result });
}
export async function pickCell(request, reply) {
  const result = await drillService.pickCell(request.server, request.user.id, request.body);
  reply.send({ success: true, data: result });
}
export async function cashout(request, reply) {
  const result = await drillService.cashout(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
