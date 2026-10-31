/* eslint-disable @typescript-eslint/no-explicit-any */
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { RecordLogsService } from './record-logs.service';
import { RecordLog } from './schemas/record-log.schema';

describe('RecordLogsService', () => {
  let service: RecordLogsService;
  let mockRecordLogModel: any;

  beforeEach(async () => {
    mockRecordLogModel = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordLogsService,
        {
          provide: getModelToken(RecordLog.name),
          useValue: mockRecordLogModel,
        },
      ],
    }).compile();

    service = module.get<RecordLogsService>(RecordLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
