import * as minesService from './mines.service.js';

export async function startGame(request, reply) {
  const { amount, minesCount } = request.body;
  const result = await minesService.startGame(request.server, request.user.id, { amount, minesCount });
  reply.send({ success: true, data: result });
}

export async function revealTile(request, reply) {
  const { tileIndex } = request.body;
  const result = await minesService.revealTile(request.server, request.user.id, { tileIndex });
  reply.send({ success: true, data: result });
}

export async function cashout(request, reply) {
  const result = await minesService.cashout(request.server, request.user.id);
  reply.send({ success: true, data: result });
}
