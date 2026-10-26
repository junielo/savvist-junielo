import { Test, TestingModule } from '@nestjs/testing';
import { RecordLogsService } from './record-logs.service';

describe('RecordLogsService', () => {
  let service: RecordLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordLogsService],
    }).compile();

    service = module.get<RecordLogsService>(RecordLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
