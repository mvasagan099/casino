import * as adminService from './admin.service.js';

export async function getDashboardStats(request, reply) {
  const stats = await adminService.getDashboardStats(request.server);
  reply.send({ success: true, data: stats });
}

export async function getUsers(request, reply) {
  const { page, limit } = request.query;
  const data = await adminService.getUsers(request.server, { page, limit });
  reply.send({ success: true, data });
}

export async function banUser(request, reply) {
  const { userId, reason } = request.body;
  const user = await adminService.banUser(request.server, request.user.id, userId, reason);
  reply.send({ success: true, data: user });
}

export async function unbanUser(request, reply) {
  const { userId } = request.body;
  const user = await adminService.unbanUser(request.server, request.user.id, userId);
  reply.send({ success: true, data: user });
}
