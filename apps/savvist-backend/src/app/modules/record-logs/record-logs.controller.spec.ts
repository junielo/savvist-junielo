/* eslint-disable @typescript-eslint/no-explicit-any */
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { RecordLogsController } from './record-logs.controller';
import { RecordLogsService } from './record-logs.service';
import { RecordLog } from './schemas/record-log.schema';

describe('RecordLogsController', () => {
  let controller: RecordLogsController;
  let mockRecordLogModel: any;

  beforeEach(async () => {
    mockRecordLogModel = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordLogsController],
      providers: [
        RecordLogsService,
        {
          provide: getModelToken(RecordLog.name),
          useValue: mockRecordLogModel,
        },
      ],
    }).compile();

    controller = module.get<RecordLogsController>(RecordLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
