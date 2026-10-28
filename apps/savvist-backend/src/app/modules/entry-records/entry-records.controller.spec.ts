import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { EntryRecordsController } from './entry-records.controller';
import { EntryRecordsService } from './entry-records.service';

describe('EntryRecordsController', () => {
  let controller: EntryRecordsController;
  let service: EntryRecordsService;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const recordId = new Types.ObjectId('665f1c2a9b1e8a0012a1c101');
  const mockUser = { _id: userId } as UserDocument;

  beforeEach(async () => {
    const mockService = {
      findByUserAndDate: jest.fn(),
      updateBalance: jest.fn(),
      deleteBalanceById: jest.fn(),
      deleteBalance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntryRecordsController],
      providers: [
        {
          provide: EntryRecordsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(CurrentUserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EntryRecordsController>(EntryRecordsController);
    service = module.get<EntryRecordsService>(EntryRecordsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate findByUserAndDate to service with userId and query', async () => {
    const query = { date: '2026-10-23' };
    const expected = [{ _id: recordId, day: '2026-10-23', balance: 500 }];
    jest.spyOn(service, 'findByUserAndDate').mockResolvedValue(expected as any);

    const result = await controller.findByUserAndDate(mockUser, query);
    expect(service.findByUserAndDate).toHaveBeenCalledWith(userId, query);
    expect(result).toBe(expected);
  });

  it('should delegate updateBalance to service with userId and dto', async () => {
    const dto = {
      accountEntryId: '665f1c2a9b1e8a0012a1c001',
      day: '2026-10-23',
      balance: 1000,
    };
    const expected = { _id: recordId, ...dto, userId };
    jest.spyOn(service, 'updateBalance').mockResolvedValue(expected as any);

    const result = await controller.updateBalance(mockUser, dto);
    expect(service.updateBalance).toHaveBeenCalledWith(userId, dto);
    expect(result).toBe(expected);
  });

  it('should delegate deleteById to service with userId and id', async () => {
    const expected = { deleted: true, _id: recordId.toString() };
    jest.spyOn(service, 'deleteBalanceById').mockResolvedValue(expected as any);

    const result = await controller.deleteById(mockUser, recordId);
    expect(service.deleteBalanceById).toHaveBeenCalledWith(userId, recordId);
    expect(result).toBe(expected);
  });

  it('should delegate deleteByQuery to service with userId and dto', async () => {
    const dto = {
      accountEntryId: '665f1c2a9b1e8a0012a1c001',
      day: '2026-10-23',
    };
    const expected = { deleted: true, _id: recordId.toString() };
    jest.spyOn(service, 'deleteBalance').mockResolvedValue(expected as any);

    const result = await controller.deleteByQuery(mockUser, dto);
    expect(service.deleteBalance).toHaveBeenCalledWith(userId, dto);
    expect(result).toBe(expected);
  });
});
