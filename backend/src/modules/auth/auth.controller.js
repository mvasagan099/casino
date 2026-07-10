import * as authService from './auth.service.js';

/**
 * Auth controller — handles HTTP request/response for auth routes.
 */

export async function register(request, reply) {
  const { email, username, password } = request.body;

  const user = await authService.registerUser(request.server, { email, username, password });

  // Auto-login after registration
  const result = await authService.loginUser(request.server, {
    login: email,
    password,
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  });

  reply.status(201).send({ success: true, data: result });
}

export async function login(request, reply) {
  const { login: loginId, password } = request.body;

  const result = await authService.loginUser(request.server, {
    login: loginId,
    password,
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  });

  reply.send({ success: true, data: result });
}

export async function refresh(request, reply) {
  const { refreshToken } = request.body;
  const tokens = await authService.refreshTokens(request.server, { refreshToken });
  reply.send({ success: true, data: tokens });
}

export async function logout(request, reply) {
  const { refreshToken } = request.body;
  const result = await authService.logoutUser(request.server, { refreshToken });
  reply.send({ success: true, message: result.message });
}

export async function me(request, reply) {
  const user = await authService.getCurrentUser(request.server, request.user.id);
  reply.send({ success: true, data: user });
}

export async function forgotPassword(request, reply) {
  const { email } = request.body;
  const result = await authService.forgotPassword(request.server, { email });
  reply.send({ success: true, message: result.message });
}

export async function resetPassword(request, reply) {
  const { token, newPassword } = request.body;
  const result = await authService.resetPassword(request.server, { token, newPassword });
  reply.send({ success: true, message: result.message });
}

export async function verifyEmail(request, reply) {
  const { token } = request.query;
  const result = await authService.verifyEmail(request.server, { token });
  reply.send({ success: true, message: result.message });
}

export async function updateSavedGames(request, reply) {
  const { savedGames } = request.body;
  const result = await authService.updateSavedGames(request.server, request.user.id, { savedGames });
  reply.send({ success: true, data: result });
}

export async function updateProfile(request, reply) {
  const { phoneNumber, countryCode } = request.body;
  const result = await authService.updateProfile(request.server, request.user.id, { phoneNumber, countryCode });
  reply.send({ success: true, data: result });
}
