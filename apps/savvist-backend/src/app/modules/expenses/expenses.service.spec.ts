/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ExpensesService } from './expenses.service';
import { Expense } from './schemas/expense.schema';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let mockExpenseModel: any;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const expenseId = new Types.ObjectId('665f1c2a9b1e8a0012a1d001');

  beforeEach(async () => {
    mockExpenseModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndDelete: jest.fn(),
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        {
          provide: getModelToken(Expense.name),
          useValue: mockExpenseModel,
        },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all expenses for user sorted', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: expenseId, name: 'Internet' }]),
      };
      mockExpenseModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll(userId);
      expect(mockExpenseModel.find).toHaveBeenCalledWith({ userId });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return an expense if found', async () => {
      mockExpenseModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: expenseId, name: 'Internet' }),
      });

      const result = await service.findOne(userId, expenseId);
      expect(result.name).toBe('Internet');
    });

    it('should throw NotFoundException if not found', async () => {
      mockExpenseModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(userId, expenseId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create an expense successfully', async () => {
      const dto = {
        name: 'Internet',
        amount: 1500,
        dayOfMonth: 21,
        months: [],
      };

      const createdDoc = {
        _id: expenseId,
        userId,
        ...dto,
        toObject: () => ({ _id: expenseId, userId, ...dto }),
      };

      mockExpenseModel.create.mockResolvedValue(createdDoc);

      const result = await service.create(userId, dto);
      expect(mockExpenseModel.create).toHaveBeenCalledWith({
        userId,
        name: 'Internet',
        amount: 1500,
        dayOfMonth: 21,
        months: [],
      });
      expect(result.name).toBe('Internet');
    });

    it('should throw BadRequestException for duplicate months', async () => {
      const dto = {
        name: 'Insurance',
        amount: 500,
        dayOfMonth: 10,
        months: [1, 1],
      };

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if dayOfMonth exceeds max days in selected month', async () => {
      const dto = {
        name: 'Feb Expense',
        amount: 500,
        dayOfMonth: 31,
        months: [2], // February max 29
      };

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should delete expense successfully', async () => {
      mockExpenseModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: expenseId }),
      });

      const result = await service.remove(userId, expenseId);
      expect(result).toEqual({ deleted: true, _id: expenseId.toString() });
    });

    it('should throw NotFoundException if expense to delete not found', async () => {
      mockExpenseModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(userId, expenseId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTotal', () => {
    it('should return aggregated total for month', async () => {
      mockExpenseModel.aggregate.mockResolvedValue([{ total: 3500 }]);

      const result = await service.getTotal(userId, 10);
      expect(mockExpenseModel.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            userId,
            $or: [{ months: { $size: 0 } }, { months: 10 }],
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);
      expect(result).toEqual({ total: 3500 });
    });

    it('should return zero if no expenses match', async () => {
      mockExpenseModel.aggregate.mockResolvedValue([]);

      const result = await service.getTotal(userId, 5);
      expect(result).toEqual({ total: 0 });
    });
  });
});
