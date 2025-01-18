import { Test, TestingModule } from '@nestjs/testing';
import { EpubController } from './epub.controller';

describe('EpubController', () => {
  let controller: EpubController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EpubController],
    }).compile();

    controller = module.get<EpubController>(EpubController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
