/* eslint-disable @typescript-eslint/no-explicit-any */
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { DailyMetricsService } from './daily-metrics.service';
import { DailyMetric } from './schemas/daily-metric.schema';
import { User } from '../users/schemas/user.schema';
import { AccountEntry } from '../account-entries/schemas/account-entry.schema';
import { EntryRecord } from '../entry-records/schemas/entry-record.schema';
import { Expense } from '../expenses/schemas/expense.schema';

describe('DailyMetricsService', () => {
  let service: DailyMetricsService;
  let mockDailyMetricModel: any;
  let mockUserModel: any;
  let mockAccountEntryModel: any;
  let mockEntryRecordModel: any;
  let mockExpenseModel: any;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');

  beforeEach(async () => {
    mockDailyMetricModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    };
    mockUserModel = {
      findById: jest.fn(),
    };
    mockAccountEntryModel = {
      find: jest.fn(),
    };
    mockEntryRecordModel = {
      findOne: jest.fn(),
    };
    mockExpenseModel = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyMetricsService,
        { provide: getModelToken(DailyMetric.name), useValue: mockDailyMetricModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(AccountEntry.name), useValue: mockAccountEntryModel },
        { provide: getModelToken(EntryRecord.name), useValue: mockEntryRecordModel },
        { provide: getModelToken(Expense.name), useValue: mockExpenseModel },
      ],
    }).compile();

    service = module.get<DailyMetricsService>(DailyMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('computeAndSaveForDay', () => {
    it('should compute and save metrics for a given day', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ baseSalary: 30000 }),
      });

      const mockAccountQuery = {
        lean: jest.fn().mockResolvedValue([
          { _id: new Types.ObjectId(), type: 'cash', name: 'BDO' },
        ]),
      };
      mockAccountEntryModel.find.mockReturnValue(mockAccountQuery);

      const mockEntryQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ balance: 15000 }),
      };
      mockEntryRecordModel.findOne.mockReturnValue(mockEntryQuery);

      const mockExpenseQuery = {
        lean: jest.fn().mockResolvedValue([{ amount: 1500, months: [] }]),
      };
      mockExpenseModel.find.mockReturnValue(mockExpenseQuery);

      const mockPrevMetricQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ totalFund: 10000 }),
      };
      mockDailyMetricModel.findOne.mockReturnValue(mockPrevMetricQuery);

      const mockUpsertQuery = {
        lean: jest.fn().mockResolvedValue({
          userId,
          day: '2026-10-31',
          totalFund: 13500,
          actualCash: 13500,
          health: 0.5,
          growth: 0.35,
        }),
      };
      mockDailyMetricModel.findOneAndUpdate.mockReturnValue(mockUpsertQuery);

      const result = await service.computeAndSaveForDay(userId, '2026-10-31');
      expect(result).toBeDefined();
      expect(result.totalFund).toBe(13500);
      expect(mockDailyMetricModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });
});
