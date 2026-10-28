import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { AccountEntriesController } from './account-entries.controller';
import { AccountEntriesService } from './account-entries.service';
import { AccountType } from './schemas/account-entry.schema';

describe('AccountEntriesController', () => {
  let controller: AccountEntriesController;
  let service: AccountEntriesService;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const accountId = new Types.ObjectId('665f1c2a9b1e8a0012a1c001');
  const mockUser = { _id: userId } as UserDocument;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountEntriesController],
      providers: [
        {
          provide: AccountEntriesService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(CurrentUserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountEntriesController>(AccountEntriesController);
    service = module.get<AccountEntriesService>(AccountEntriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to service with userId', async () => {
    const dto = { name: 'BDO Debit', type: AccountType.CASH };
    const expected = { _id: accountId, ...dto, userId };
    jest.spyOn(service, 'create').mockResolvedValue(expected as any);

    const result = await controller.create(mockUser, dto);
    expect(service.create).toHaveBeenCalledWith(userId, dto);
    expect(result).toBe(expected);
  });

  it('should delegate findAll to service with userId and query', async () => {
    const query = { includeArchived: true };
    const expected = [{ _id: accountId, name: 'BDO Debit' }];
    jest.spyOn(service, 'findAll').mockResolvedValue(expected as any);

    const result = await controller.findAll(mockUser, query);
    expect(service.findAll).toHaveBeenCalledWith(userId, query);
    expect(result).toBe(expected);
  });

  it('should delegate findOne to service with userId and id', async () => {
    const expected = { _id: accountId, name: 'BDO Debit' };
    jest.spyOn(service, 'findOne').mockResolvedValue(expected as any);

    const result = await controller.findOne(mockUser, accountId);
    expect(service.findOne).toHaveBeenCalledWith(userId, accountId);
    expect(result).toBe(expected);
  });

  it('should delegate update to service with userId, id and dto', async () => {
    const dto = { name: 'Updated' };
    const expected = { _id: accountId, name: 'Updated' };
    jest.spyOn(service, 'update').mockResolvedValue(expected as any);

    const result = await controller.update(mockUser, accountId, dto);
    expect(service.update).toHaveBeenCalledWith(userId, accountId, dto);
    expect(result).toBe(expected);
  });

  it('should delegate remove to service with userId and id', async () => {
    const expected = { deleted: true, _id: accountId.toString() };
    jest.spyOn(service, 'remove').mockResolvedValue(expected as any);

    const result = await controller.remove(mockUser, accountId);
    expect(service.remove).toHaveBeenCalledWith(userId, accountId);
    expect(result).toBe(expected);
  });
});
