import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import * as process from 'process';
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
console.log("app is listen on port :" + process.env.PORT);

  await app.listen(8000);

}
bootstrap();
