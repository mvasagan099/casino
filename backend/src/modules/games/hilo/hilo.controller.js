import * as hiloService from './hilo.service.js';

export async function startGame(request, reply) {
  const { amount } = request.body;
  const result = await hiloService.startGame(request.server, request.user.id, { amount });
  reply.send({ success: true, data: result });
}

export async function guess(request, reply) {
  const { direction } = request.body;
  const result = await hiloService.guess(request.server, request.user.id, { direction });
  reply.send({ success: true, data: result });
}

export async function cashout(request, reply) {
  const result = await hiloService.cashout(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
