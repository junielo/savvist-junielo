/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { RecordLogsController } from './record-logs.controller';
import { RecordLogsService } from './record-logs.service';

describe('RecordLogsController', () => {
  let controller: RecordLogsController;
  let service: RecordLogsService;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const mockUser = { _id: userId } as UserDocument;

  beforeEach(async () => {
    const mockService = {
      getAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordLogsController],
      providers: [
        {
          provide: RecordLogsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(CurrentUserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RecordLogsController>(RecordLogsController);
    service = module.get<RecordLogsService>(RecordLogsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getAll to service with userId', async () => {
    const expected = [{ _id: new Types.ObjectId(), name: 'Test Log' }];
    jest.spyOn(service, 'getAll').mockResolvedValue(expected as any);

    const result = await controller.getAll(mockUser);
    expect(service.getAll).toHaveBeenCalledWith(userId);
    expect(result).toBe(expected);
  });
});
