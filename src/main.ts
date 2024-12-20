import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import * as process from 'process';
import { hostname } from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const errorMessages = errors.map(
          (error) =>
            `${error.property}: ${Object.values(error.constraints).join(', ')}`,
        );
        return new BadRequestException(errorMessages);
      },
    }),
  );

  const port = process.env.PORT || 4000;
  console.log(`app is listening on port: ${port}`);

  await app.listen(port, '0.0.0.0');
}

bootstrap();
