import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log('listen on port : ', process.env.PORT);
  app.enableCors({
    origin: [process.env.CLIENT_ORIGIN, 'http://localhost:3000'], // Replace with the specific origin(s) if needed
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
    credentials: true, // Allows sending cookies
  });
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
