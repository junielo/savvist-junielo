/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { TransactionService } from '../../database/transaction.service';
import { RecordLogsService } from '../record-logs/record-logs.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;
  let mockTransactionService: any;
  let mockRecordLogsService: any;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');

  beforeEach(async () => {
    mockUserModel = {
      estimatedDocumentCount: jest.fn().mockResolvedValue(1),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    mockTransactionService = {
      run: jest.fn((work) => work({} as any)),
    };

    mockRecordLogsService = {
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
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

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateCurrent - base salary logging', () => {
    it('(a) first salary change gives created action and correct log data', async () => {
      const mockUserDoc = {
        _id: userId,
        displayName: 'John Doe',
        baseSalary: 0,
        isUnemployed: false,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        session: jest.fn().mockResolvedValue(mockUserDoc),
      };
      mockUserModel.findOne.mockReturnValue(mockQuery);
      mockRecordLogsService.findOne.mockResolvedValue(null); // No previous salary log

      await service.updateCurrent({ baseSalary: 50000 });

      expect(mockRecordLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          name: 'Base salary updated',
          amount: 50000,
          recordType: 'cash',
          action: 'created',
          sourceCollection: 'users',
          sourceId: userId,
          previousAmount: 0,
        }),
        expect.any(Object),
      );
    });

    it('(b) later change gives updated action with previousAmount', async () => {
      const mockUserDoc = {
        _id: userId,
        displayName: 'John Doe',
        baseSalary: 50000,
        isUnemployed: false,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        session: jest.fn().mockResolvedValue(mockUserDoc),
      };
      mockUserModel.findOne.mockReturnValue(mockQuery);
      mockRecordLogsService.findOne.mockResolvedValue({ _id: new Types.ObjectId() }); // Existing log

      await service.updateCurrent({ baseSalary: 60000 });

      expect(mockRecordLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          name: 'Base salary updated',
          amount: 60000,
          recordType: 'cash',
          action: 'updated',
          sourceCollection: 'users',
          sourceId: userId,
          previousAmount: 50000,
        }),
        expect.any(Object),
      );
    });

    it('(c) setting isUnemployed = true with a salary writes a log with amount 0 and previousAmount', async () => {
      const mockUserDoc = {
        _id: userId,
        displayName: 'John Doe',
        baseSalary: 30000,
        isUnemployed: false,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        session: jest.fn().mockResolvedValue(mockUserDoc),
      };
      mockUserModel.findOne.mockReturnValue(mockQuery);
      mockRecordLogsService.findOne.mockResolvedValue({ _id: new Types.ObjectId() });

      await service.updateCurrent({ isUnemployed: true, baseSalary: 30000 });

      expect(mockUserDoc.baseSalary).toBe(0);
      expect(mockRecordLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          amount: 0,
          previousAmount: 30000,
          action: 'updated',
        }),
        expect.any(Object),
      );
    });

    it('(d) changing only salaryDay1 writes no log', async () => {
      const mockUserDoc = {
        _id: userId,
        displayName: 'John Doe',
        baseSalary: 50000,
        salaryDay1: 15,
        isUnemployed: false,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        session: jest.fn().mockResolvedValue(mockUserDoc),
      };
      mockUserModel.findOne.mockReturnValue(mockQuery);

      await service.updateCurrent({ salaryDay1: 20 });

      expect(mockRecordLogsService.create).not.toHaveBeenCalled();
    });

    it('(e) saving the same salary writes no log', async () => {
      const mockUserDoc = {
        _id: userId,
        displayName: 'John Doe',
        baseSalary: 50000,
        isUnemployed: false,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        session: jest.fn().mockResolvedValue(mockUserDoc),
      };
      mockUserModel.findOne.mockReturnValue(mockQuery);

      await service.updateCurrent({ baseSalary: 50000 });

      expect(mockRecordLogsService.create).not.toHaveBeenCalled();
    });
  });
});
