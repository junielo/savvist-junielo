/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { TransactionService } from '../../database/transaction.service';
import { RecordLogsService } from '../record-logs/record-logs.service';
import { ExpensesService } from './expenses.service';
import { Expense } from './schemas/expense.schema';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let mockExpenseModel: any;
  let mockTransactionService: any;
  let mockRecordLogsService: any;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const expenseId = new Types.ObjectId('665f1c2a9b1e8a0012a1d001');

  beforeEach(async () => {
    mockExpenseModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: expenseId,
      save: jest.fn().mockResolvedValue({}),
      toObject: jest.fn().mockReturnValue({ _id: expenseId, ...dto }),
    }));
    mockExpenseModel.find = jest.fn();
    mockExpenseModel.findOne = jest.fn();
    mockExpenseModel.create = jest.fn();
    mockExpenseModel.findOneAndDelete = jest.fn();
    mockExpenseModel.aggregate = jest.fn();

    mockTransactionService = {
      run: jest.fn((work) => work({} as any)),
    };

    mockRecordLogsService = {
      create: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        {
          provide: getModelToken(Expense.name),
          useValue: mockExpenseModel,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: RecordLogsService,
          useValue: mockRecordLogsService,
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
      expect(result).toHaveLength(1);
    });
  });

  describe('create and createMany', () => {
    it('creates a single expense via create', async () => {
      const dto = { name: 'Rent', amount: 15000, dayOfMonth: 5 };
      const result = await service.create(userId, dto);

      expect(result.name).toBe('Rent');
      expect(result.amount).toBe(15000);
      expect(mockRecordLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          name: 'Rent',
          amount: 15000,
          action: 'created',
        }),
        expect.anything(),
      );
    });

    it('creates multiple expenses in a batch via createMany', async () => {
      const dtos = [
        { name: 'Rent', amount: 15000, dayOfMonth: 5 },
        { name: 'Internet', amount: 1899, dayOfMonth: 20 },
      ];
      const results = await service.createMany(userId, dtos);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Rent');
      expect(results[1].name).toBe('Internet');
      expect(mockRecordLogsService.create).toHaveBeenCalledTimes(2);
    });

    it('throws BadRequestException if dayOfMonth is invalid for selected months', async () => {
      const invalidDto = { name: 'Gym', amount: 1200, dayOfMonth: 31, months: [2] }; // Feb 31 invalid
      await expect(service.create(userId, invalidDto)).rejects.toThrow(BadRequestException);
    });
  });
});
