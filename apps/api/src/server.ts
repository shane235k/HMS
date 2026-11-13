// apps/api/src/server.ts
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from '@hbms/database';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 HBMS Backend API running on port ${env.PORT}`);
  console.log(`🌐 Environment: ${env.NODE_ENV}`);
  console.log(`📡 URL: http://localhost:${env.PORT}`);
  console.log(`===============================================`);
});

const gracefulShutdown = async () => {
  console.log('\nReceived shutdown signal. Closing server & database connections...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Server and database gracefully terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

