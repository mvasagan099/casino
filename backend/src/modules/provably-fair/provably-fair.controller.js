import * as pfService from './provably-fair.service.js';

export async function getCurrentSeed(request, reply) {
  const seed = await pfService.getCurrentSeed(request.server, request.user.id);
  reply.send({ success: true, data: seed });
}

export async function rotateSeeds(request, reply) {
  const result = await pfService.rotateSeeds(request.server, request.user.id);
  reply.send({ success: true, data: result });
}

export async function updateClientSeed(request, reply) {
  const { clientSeed } = request.body;
  const seed = await pfService.updateClientSeed(request.server, request.user.id, { clientSeed });
  reply.send({ success: true, data: seed });
}

export async function verifyBet(request, reply) {
  const { serverSeed, clientSeed, nonce } = request.body;
  const result = await pfService.verifyBet(request.server, { serverSeed, clientSeed, nonce });
  reply.send({ success: true, data: result });
}
