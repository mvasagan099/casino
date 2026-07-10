import { getAffiliateStats, getAffiliateHistory } from './affiliate.service.js';

export async function getStats(request, reply) {
  const userId = request.user.id;
  const stats = await getAffiliateStats(request.server, userId);
  return reply.send({ success: true, data: stats });
}

export async function getHistory(request, reply) {
  const userId = request.user.id;
  const history = await getAffiliateHistory(request.server, userId);
  return reply.send({ success: true, data: history });
}
