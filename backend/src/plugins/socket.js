import fp from 'fastify-plugin';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

/**
 * Socket.IO Fastify plugin — registered before server starts so
 * fastify.decorate('io') is called at the right time.
 */
function socketPlugin(fastify, opts, done) {
  const io = new Server({
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    },
  });

  const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

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
    io.emit('users:online', { count: onlineUsers.size });

    // ── Chat ────────────────────────────────────────────────
    socket.on('chat:message', ({ message }) => {
      if (!message || typeof message !== 'string' || !message.trim() || message.length > 500) return;
      io.emit('chat:message', {
        userId,
        username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });
    });

    // ── Game Rooms ──────────────────────────────────────────
    socket.on('game:join', ({ gameSlug }) => socket.join(`game:${gameSlug}`));
    socket.on('game:leave', ({ gameSlug }) => socket.leave(`game:${gameSlug}`));

    // ── Disconnect ──────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('users:online', { count: onlineUsers.size });
      fastify.log.info(`[socket] ${username} disconnected`);
    });
  });

  fastify.decorate('io', io);

  // Attach Socket.IO to Fastify's HTTP server after ready
  fastify.addHook('onReady', (next) => {
    io.attach(fastify.server);
    fastify.log.info('[socket] Socket.IO gateway initialized');
    next();
  });

  fastify.addHook('onClose', (instance, next) => {
    pubClient.quit();
    subClient.quit();
    io.close();
    next();
  });

  done();
}

export default fp(socketPlugin, {
  name: 'socket',
  dependencies: ['jwt'],
});
