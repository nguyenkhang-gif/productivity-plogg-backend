import { Test, TestingModule } from '@nestjs/testing';
import { EpubService } from './epub.service';

describe('EpubService', () => {
  let service: EpubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EpubService],
    }).compile();

    service = module.get<EpubService>(EpubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
