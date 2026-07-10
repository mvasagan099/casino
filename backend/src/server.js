import { env } from './config/env.js';
import { buildApp } from './app.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      port: env.port,
      host: '0.0.0.0',
    });

    app.log.info(`🚀 Server running at http://localhost:${env.port}`);
    app.log.info(`📋 Health check at http://localhost:${env.port}/api/health`);
    app.log.info(`🔐 Auth API at http://localhost:${env.port}/api/auth`);
    app.log.info(`💰 Wallet API at http://localhost:${env.port}/api/wallet`);
    app.log.info(`🎲 Provably Fair API at http://localhost:${env.port}/api/provably-fair`);
    app.log.info(`🎮 Games API at http://localhost:${env.port}/api/games`);
  } catch (err) {
    app.log.fatal(err);
    process.exit(1);
  }

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      process.exit(0);
    });
  }
}

start();
