/* eslint-disable @typescript-eslint/no-explicit-any */
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { RecordLogsService } from './record-logs.service';
import { RecordLog } from './schemas/record-log.schema';

describe('RecordLogsService', () => {
  let service: RecordLogsService;
  let mockRecordLogModel: any;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');

  beforeEach(async () => {
    mockRecordLogModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

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

  describe('getAll', () => {
    it('should return all record logs for user sorted from latest to oldest', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId(), name: 'Test Log' }]),
      };
      mockRecordLogModel.find.mockReturnValue(mockQuery);

      const result = await service.getAll(userId);
      expect(mockRecordLogModel.find).toHaveBeenCalledWith({ userId });
      expect(mockQuery.sort).toHaveBeenCalledWith({ date: -1, createdAt: -1 });
      expect(result).toHaveLength(1);
    });
  });
});
