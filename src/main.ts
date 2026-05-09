import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  console.log('listen on port : ', process.env.PORT);

  // Tăng giới hạn kích thước payload
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: [process.env.CLIENT_ORIGIN, 'http://localhost:3000', 'http://34.206.37.238'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', 
    credentials: true, 
  });

  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000,'0.0.0.0');

  const memoryUsage = process.memoryUsage();
  console.log('Memory Usage at Start:', {
    port: process.env.PORT ?? 3000,
    rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
    heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
    heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    external: (memoryUsage.external / 1024 / 1024).toFixed(2) + ' MB',
    arrayBuffers: (memoryUsage.arrayBuffers / 1024 / 1024).toFixed(2) + ' MB'
  });
}

bootstrap();
