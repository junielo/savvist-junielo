/* eslint-disable @typescript-eslint/no-explicit-any */
import { SlotExtractor, SlotSchema } from './slot-extractor';

describe('SlotExtractor & SlotSchema', () => {
  describe('SlotSchema null-tolerance', () => {
    it('parses null fields for expenses without errors', () => {
      const expensePayload = {
        searchName: null,
        month: null,
        limit: null,
        accountName: null,
        standaloneQuery: 'How much are my expenses for this month?',
      };

      const result = SlotSchema.safeParse(expensePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.searchName).toBeNull();
        expect(result.data.month).toBeNull();
        expect(result.data.standaloneQuery).toBe('How much are my expenses for this month?');
      }
    });

    it('parses null fields for record logs without errors', () => {
      const recordLogPayload = {
        searchName: null,
        month: null,
        limit: 10,
        accountName: null,
        standaloneQuery: 'Show me my last 10 record logs',
      };

      const result = SlotSchema.safeParse(recordLogPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.searchName).toBeNull();
        expect(result.data.limit).toBe(10);
        expect(result.data.date).toBeNull();
      }
    });

    it('parses date field for balance queries', () => {
      const balancePayload = {
        searchName: null,
        month: null,
        limit: null,
        accountName: null,
        date: 'today',
        standaloneQuery: 'did I input my account balances for today?',
      };

      const result = SlotSchema.safeParse(balancePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe('today');
        expect(result.data.standaloneQuery).toBe('did I input my account balances for today?');
      }
    });

    it('parses entries array for batch balance recording', () => {
      const batchPayload = {
        searchName: null,
        month: null,
        limit: null,
        accountName: null,
        entries: [
          { accountName: 'BDO', amount: 45000 },
          { accountName: 'GCredit', amount: 11000 },
        ],
        date: 'today',
        standaloneQuery: 'Today, my BDO amount is 45,000 and for GCredit is 11,000',
      };

      const result = SlotSchema.safeParse(batchPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entries).toHaveLength(2);
        expect(result.data.entries?.[0].accountName).toBe('BDO');
        expect(result.data.entries?.[0].amount).toBe(45000);
        expect(result.data.entries?.[1].accountName).toBe('GCredit');
        expect(result.data.entries?.[1].amount).toBe(11000);
      }
    });

    it('parses baseSalary and isUnemployed for salary update intent', () => {
      const salaryPayload = {
        searchName: null,
        month: null,
        limit: null,
        accountName: null,
        baseSalary: 60000,
        isUnemployed: false,
        standaloneQuery: 'Update my base salary to 60k',
      };

      const result = SlotSchema.safeParse(salaryPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.baseSalary).toBe(60000);
        expect(result.data.isUnemployed).toBe(false);
      }
    });

    it('parses isUnemployed true and baseSalary 0', () => {
      const unemployedPayload = {
        searchName: null,
        month: null,
        limit: null,
        accountName: null,
        baseSalary: 0,
        isUnemployed: true,
        standaloneQuery: 'I am currently unemployed',
      };

      const result = SlotSchema.safeParse(unemployedPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.baseSalary).toBe(0);
        expect(result.data.isUnemployed).toBe(true);
      }
    });

    it('parses null fields for wishlist without errors', () => {
      const wishlistPayload = {
        searchName: null,
        month: null,
        limit: null,
        accountName: null,
        standaloneQuery: 'how many wishlist items I already purchased?',
        readArgs: {
          filters: [
            {
              field: 'status',
              op: 'eq',
              value: 'purchased',
              valueTo: null,
              values: null,
            },
          ],
          period: null,
          sort: null,
          limit: null,
          aggregate: {
            groupBy: 'month',
            dateField: 'purchasedAt',
            metric: 'sum',
            field: 'amount',
          },
        },
      };

      const result = SlotSchema.safeParse(wishlistPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.readArgs?.filters[0].field).toBe('status');
        expect(result.data.readArgs?.filters[0].value).toBe('purchased');
        expect(result.data.readArgs?.period).toBeFalsy();
        expect(result.data.readArgs?.aggregate?.groupBy).toBe('month');
        expect(result.data.readArgs?.aggregate?.metric).toBe('sum');
      }
    });

    it('handles completely empty payload by falling back cleanly', () => {
      const result = SlotSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.searchName).toBeNull();
        expect(result.data.standaloneQuery).toBe('');
      }
    });
  });

  describe('SlotExtractor service', () => {
    let mockGeminiService: any;
    let mockObservability: any;
    let extractor: SlotExtractor;

    beforeEach(() => {
      mockObservability = {
        setLLMCall: jest.fn(),
      };
      mockGeminiService = {
        getModel: jest.fn(),
      };
      extractor = new SlotExtractor(mockGeminiService, mockObservability);
    });

    it('extracts slots successfully and records to observability', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({
        content: JSON.stringify({
          searchName: 'Condo Rent',
          month: null,
          limit: null,
          accountName: null,
          standaloneQuery: 'When is condo rent due?',
        }),
      });
      mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

      const slots = await extractor.extract('When is condo rent due?', undefined, 'read_expenses');

      expect(slots.searchName).toBe('Condo Rent');
      expect(slots.standaloneQuery).toBe('When is condo rent due?');
      expect(mockObservability.setLLMCall).toHaveBeenCalledWith(
        'slot-extractor',
        expect.objectContaining({
          message: 'When is condo rent due?',
          intent: 'read_expenses',
        }),
      );
    });

    it('accepts multi-turn HistoryMessage array and includes it in prompt', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({
        content: JSON.stringify({
          searchName: null,
          month: null,
          limit: 1,
          accountName: null,
          standaloneQuery: 'What is my most expensive expense?',
        }),
      });
      mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

      const history = [
        { role: 'user' as const, text: 'What is my most expensive wishlist item?' },
        { role: 'assistant' as const, text: 'Your most expensive pending wishlist item is Qatar Budget.' },
      ];

      const slots = await extractor.extract('what about my expenses?', history, 'read_expenses');

      expect(slots.standaloneQuery).toBe('What is my most expensive expense?');
      expect(mockInvoke).toHaveBeenCalledWith(expect.stringContaining('What is my most expensive wishlist item?'));
      expect(mockInvoke).toHaveBeenCalledWith(expect.stringContaining('Qatar Budget'));
    });

    it('falls back gracefully on parse error without throwing and logs error', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({
        content: 'Not valid JSON at all',
      });
      mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

      const slots = await extractor.extract('expenses query', undefined, 'read_expenses');

      expect(slots.incomplete).toBe(false);
      expect(slots.standaloneQuery).toBe('expenses query');
      expect(mockObservability.setLLMCall).toHaveBeenCalled();
    });
  });
});
