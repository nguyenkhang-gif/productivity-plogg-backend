import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './shared/database/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: { $queryRaw: jest.fn() } },
        { provide: getConnectionToken(), useValue: { readyState: 1 } },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('returns "Hello World!"', () => {
    expect(appController.getHello()).toBe('Hello World!');
  });

  it('reports Mongo status without exposing the connection string', () => {
    expect(appController.getMongooseStatus()).toEqual({ status: 'Connected' });
  });

  it('reports health', () => {
    expect(appController.health()).toEqual({ status: 'ok' });
  });
});
