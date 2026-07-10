import { Server } from 'socket.io';

/**
 * Socket.IO gateway — attaches to the Fastify HTTP server.
 * Handles real-time events: chat, live bets, notifications, online users.
 */
export function createSocketGateway(fastify) {
  const io = new Server(fastify.server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // Track online users: userId → socketId
  const onlineUsers = new Map();

  // ─── Auth Middleware ─────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication token required'));

    try {
      const decoded = fastify.jwt.verify(token);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ──────────────────────────────────
  io.on('connection', (socket) => {
    const { id: userId, username } = socket.user;

    fastify.log.info(`[socket] ${username} connected (${socket.id})`);
    onlineUsers.set(userId, socket.id);

    // Broadcast updated online count
    io.emit('users:online', { count: onlineUsers.size });

    // ── Chat ────────────────────────────────────────────────
    socket.on('chat:message', (data) => {
      const { message } = data;
      if (!message || typeof message !== 'string' || message.trim().length === 0) return;
      if (message.length > 500) return;

      io.emit('chat:message', {
        userId,
        username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });
    });

    // ── Join/Leave rooms ────────────────────────────────────
    socket.on('game:join', ({ gameSlug }) => {
      socket.join(`game:${gameSlug}`);
    });

    socket.on('game:leave', ({ gameSlug }) => {
      socket.leave(`game:${gameSlug}`);
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('users:online', { count: onlineUsers.size });
      fastify.log.info(`[socket] ${username} disconnected`);
    });
  });

  // Decorate fastify with io so game services can emit events
  fastify.decorate('io', io);

  fastify.log.info('[socket] Socket.IO gateway initialized');
  return io;
}
