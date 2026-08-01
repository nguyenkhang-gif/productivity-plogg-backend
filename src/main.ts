import './polyfills';
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import { RedisIoAdapter } from './infrastructure/websocket/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  console.log('listen on port : ', process.env.PORT);

  // Tăng giới hạn kích thước payload
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.enableShutdownHooks();

  const redisIoAdapter = new RedisIoAdapter(app);

  try {
    await redisIoAdapter.connectToRedis();
  } catch (err) {
    console.error('Redis adapter fail — chạy single-instance:', err.message);
  }
  app.useWebSocketAdapter(redisIoAdapter);

  const shutdown = async (signal: string) => {
    console.log(`Nhận ${signal} - đóng redis + app...`);
    await redisIoAdapter.closeRedis();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }),
  );

  const allowedOrigins = new Set([
    'http://localhost:3000',
    'https://knn-productivity.vercel.app',
    'http://knnpb.duckdns.org',
    'http://34.206.37.238',
    'http://107.21.107.160',
    ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : []),
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin === 'null' ||
        allowedOrigins.has(origin) ||
        origin?.endsWith('.trycloudflare.com')
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,Accept',
    credentials: true,
  });

  app.use(cookieParser());

  // Backlog mặc định của Node là 511 — tăng lên để chịu được burst connect
  // (HTTP request lẫn WebSocket upgrade) khi nhiều client connect gần như
  // cùng lúc, tránh bị reset ở tầng TCP trước khi tới được Nest.
  await app.init();
  const httpServer = app.getHttpServer();
  httpServer.listen({
    port: process.env.PORT ?? 3000,
    host: '0.0.0.0',
    backlog: 2048,
  });

  const memoryUsage = process.memoryUsage();
  console.log('Memory Usage at Start:', {
    port: process.env.PORT ?? 3000,
    rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
    heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
    heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    external: (memoryUsage.external / 1024 / 1024).toFixed(2) + ' MB',
    arrayBuffers: (memoryUsage.arrayBuffers / 1024 / 1024).toFixed(2) + ' MB',
  });
}

bootstrap();
