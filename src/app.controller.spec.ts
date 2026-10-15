import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './infrastructure/databases/prisma/prisma.service';
import { CacheService } from './infrastructure/cache/cache.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    // AppService chỉ cần Prisma/Cache cho các endpoint status — getHello không
    // chạm tới chúng, nên stub rỗng là đủ để module compile.
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: {} },
        { provide: CacheService, useValue: {} },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
