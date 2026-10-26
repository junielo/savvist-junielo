import { Test, TestingModule } from '@nestjs/testing';
import { EntryRecordsService } from './entry-records.service';

describe('EntryRecordsService', () => {
  let service: EntryRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntryRecordsService],
    }).compile();

    service = module.get<EntryRecordsService>(EntryRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
