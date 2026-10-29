import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  let service: ExpensesService;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const expenseId = new Types.ObjectId('665f1c2a9b1e8a0012a1d001');
  const mockUser = { _id: userId } as UserDocument;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getTotal: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [
        {
          provide: ExpensesService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(CurrentUserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExpensesController>(ExpensesController);
    service = module.get<ExpensesService>(ExpensesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate findAll to service with userId', async () => {
    const expected = [{ _id: expenseId, name: 'Internet' }];
    jest.spyOn(service, 'findAll').mockResolvedValue(expected as any);

    const result = await controller.findAll(mockUser);
    expect(service.findAll).toHaveBeenCalledWith(userId);
    expect(result).toBe(expected);
  });

  it('should delegate findOne to service with userId and id', async () => {
    const expected = { _id: expenseId, name: 'Internet' };
    jest.spyOn(service, 'findOne').mockResolvedValue(expected as any);

    const result = await controller.findOne(mockUser, expenseId);
    expect(service.findOne).toHaveBeenCalledWith(userId, expenseId);
    expect(result).toBe(expected);
  });

  it('should delegate create to service with userId and dto', async () => {
    const dto = { name: 'Internet', amount: 1500, dayOfMonth: 21, months: [] };
    const expected = { _id: expenseId, ...dto, userId };
    jest.spyOn(service, 'create').mockResolvedValue(expected as any);

    const result = await controller.create(mockUser, dto);
    expect(service.create).toHaveBeenCalledWith(userId, dto);
    expect(result).toBe(expected);
  });

  it('should delegate update to service with userId, id and dto', async () => {
    const dto = { amount: 1600 };
    const expected = { _id: expenseId, amount: 1600, userId };
    jest.spyOn(service, 'update').mockResolvedValue(expected as any);

    const result = await controller.update(mockUser, expenseId, dto);
    expect(service.update).toHaveBeenCalledWith(userId, expenseId, dto);
    expect(result).toBe(expected);
  });

  it('should delegate remove to service with userId and id', async () => {
    const expected = { deleted: true, _id: expenseId.toString() };
    jest.spyOn(service, 'remove').mockResolvedValue(expected as any);

    const result = await controller.remove(mockUser, expenseId);
    expect(service.remove).toHaveBeenCalledWith(userId, expenseId);
    expect(result).toBe(expected);
  });

  it('should delegate getTotal to service with userId and month', async () => {
    const expected = { total: 3500 };
    jest.spyOn(service, 'getTotal').mockResolvedValue(expected);

    const result = await controller.getTotal(mockUser, '10');
    expect(service.getTotal).toHaveBeenCalledWith(userId, 10);
    expect(result).toBe(expected);
  });
});
