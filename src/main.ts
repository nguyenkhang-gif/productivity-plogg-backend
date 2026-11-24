import './polyfills';
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import { RedisIoAdapter } from './shared/realtime/redis-io.adapter';

const LARGE_BODY_PREFIXES = [
  '/api/epub',
  '/api/translation-contexts',
  '/api/story-contexts',
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  for (const prefix of LARGE_BODY_PREFIXES) {
    app.use(prefix, express.json({ limit: '10mb' }));
  }
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

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
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const allowedOrigins = new Set([
    'https://knn-productivity.vercel.app',
    'http://knnpb.duckdns.org',
    'http://34.206.37.238',
    'http://107.21.107.160',
    ...(process.env.CLIENT_ORIGIN ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
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

  new Logger('Bootstrap').log(`Listening on port ${process.env.PORT ?? 3000}`);
}

bootstrap();
