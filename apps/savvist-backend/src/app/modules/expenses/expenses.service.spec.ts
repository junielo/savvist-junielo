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
    mockExpenseModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndDelete: jest.fn(),
      aggregate: jest.fn(),
    };

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
});
