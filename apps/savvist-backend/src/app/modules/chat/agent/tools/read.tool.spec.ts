import { ReadTool } from './read.tool';
import { Types } from 'mongoose';

describe('ReadTool - Expenses with Due Dates', () => {
  let readTool: ReadTool;
  let mockDashboardService: any;
  let mockExpensesService: any;
  let mockWishlistService: any;
  let mockRecordLogsService: any;
  let mockUsersService: any;
  let mockAccountEntriesService: any;

  const userId = new Types.ObjectId('6adf58efb1a87dfd54b8d3a3');

  beforeEach(() => {
    mockDashboardService = {
      getSummary: jest.fn().mockResolvedValue({}),
      getTrend: jest.fn().mockResolvedValue([]),
    };
    mockExpensesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };
    mockWishlistService = {
      findAll: jest.fn().mockResolvedValue([]),
    };
    mockRecordLogsService = {
      search: jest.fn().mockResolvedValue([]),
    };
    mockUsersService = {
      findById: jest.fn().mockResolvedValue({
        timeZone: 'Asia/Manila',
        displayName: 'Test User',
      }),
    };
    mockAccountEntriesService = {
      findAll: jest.fn().mockResolvedValue([]),
    };

    readTool = new ReadTool(
      mockDashboardService,
      mockExpensesService,
      mockWishlistService,
      mockRecordLogsService,
      mockUsersService,
      mockAccountEntriesService,
    );
  });

  describe('getExpenses', () => {
    it('enriches matched expenses with nextDueDate and daysUntilDue', async () => {
      mockExpensesService.findAll.mockResolvedValue([
        {
          _id: new Types.ObjectId('6adf58efb1a87dfd54b8d3b1'),
          name: 'Condo Rent',
          amount: 14000,
          dayOfMonth: 1,
          months: [],
        },
        {
          _id: new Types.ObjectId('6adf58efb1a87dfd54b8d3b2'),
          name: 'Internet',
          amount: 2000,
          dayOfMonth: 15,
          months: [],
        },
      ]);

      const result = await readTool.getExpenses(userId, 'Condo Rent');

      expect(result.found).toBe(true);
      expect(result.matchedCount).toBe(1);
      expect(result.matched[0].name).toBe('Condo Rent');
      expect(result.matched[0].amount).toBe(14000);
      expect(result.matched[0].dayOfMonth).toBe(1);
      expect(typeof result.matched[0].nextDueDate).toBe('string');
      expect(typeof result.matched[0].daysUntilDue).toBe('number');
      expect(result.matched[0].daysUntilDue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('listExpensesByDueDate', () => {
    it('returns expenses sorted by nextDueDate', async () => {
      mockExpensesService.findAll.mockResolvedValue([
        {
          _id: new Types.ObjectId('6adf58efb1a87dfd54b8d3b1'),
          name: 'Condo Rent',
          amount: 14000,
          dayOfMonth: 1,
          months: [],
        },
        {
          _id: new Types.ObjectId('6adf58efb1a87dfd54b8d3b2'),
          name: 'Internet',
          amount: 2000,
          dayOfMonth: 15,
          months: [],
        },
      ]);

      const rows = await readTool.listExpensesByDueDate({
        userId: String(userId),
        order: 'asc',
        limit: 5,
      });

      expect(rows).toHaveLength(2);
      expect(rows[0].dueDate).toBeDefined();
      expect(rows[1].dueDate).toBeDefined();
      expect(rows[0].dueDate! <= rows[1].dueDate!).toBe(true);
    });
  });

  describe('getExpenseById', () => {
    it('returns single expense row with dueDate', async () => {
      const expId = new Types.ObjectId('6adf58efb1a87dfd54b8d3b1');
      mockExpensesService.findOne.mockResolvedValue({
        _id: expId,
        name: 'Condo Rent',
        amount: 14000,
        dayOfMonth: 1,
        months: [],
      });

      const row = await readTool.getExpenseById(String(userId), String(expId));

      expect(row).not.toBeNull();
      expect(row?.name).toBe('Condo Rent');
      expect(row?.dueDate).toBeDefined();
    });

    it('returns null if expense is not found or error thrown', async () => {
      mockExpensesService.findOne.mockRejectedValue(new Error('Not found'));
      const row = await readTool.getExpenseById(String(userId), 'invalid-id');
      expect(row).toBeNull();
    });
  });

  describe('queryWishlist', () => {
    it('executes dynamic aggregation and returns aggregate in result payload', async () => {
      mockWishlistService.findAll.mockResolvedValue([
        {
          _id: new Types.ObjectId('6adf58efb1a87dfd54b8d3c1'),
          name: 'Noise Cancelling Headphones',
          amount: 8000,
          priority: 'asap',
          status: 'purchased',
          createdAt: new Date('2026-09-01'),
          purchasedAt: new Date('2026-09-15'),
        },
        {
          _id: new Types.ObjectId('6adf58efb1a87dfd54b8d3c2'),
          name: 'Mechanical Keyboard',
          amount: 4500,
          priority: 'priority',
          status: 'purchased',
          createdAt: new Date('2026-10-01'),
          purchasedAt: new Date('2026-10-12'),
        },
      ]);

      const result = await readTool.queryWishlist(userId, {
        filters: [{ field: 'status', op: 'eq', value: 'purchased' }],
        aggregate: {
          groupBy: 'month',
          dateField: 'purchasedAt',
          metric: 'sum',
        },
      });

      expect(result.found).toBe(true);
      expect(result.aggregate).toBeDefined();
      expect(result.aggregate.groupBy).toBe('month');
      expect(result.aggregate.overallTotal).toBe(12500);
      expect(result.aggregate.groups).toHaveLength(2);
      expect(result.aggregate.groups[0].key).toBe('2026-09');
      expect(result.aggregate.groups[0].value).toBe(8000);
      expect(result.aggregate.groups[1].key).toBe('2026-10');
      expect(result.aggregate.groups[1].value).toBe(4500);
    });
  });
});
