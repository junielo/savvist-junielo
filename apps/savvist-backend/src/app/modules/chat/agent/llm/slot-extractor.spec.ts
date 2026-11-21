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

    it('parses expenses array for single and batch expense recording', () => {
      const expensesPayload = {
        searchName: null,
        month: null,
        limit: null,
        accountName: null,
        expenses: [
          { name: 'Rent', amount: 15000, dayOfMonth: 5, months: [] },
          { name: 'Car Insurance', amount: 4500, dayOfMonth: 10, months: [3, 9] },
          { name: 'Water', amount: 500, dayOfMonth: null },
        ],
        standaloneQuery: 'Add Rent 15000 on the 5th, Car Insurance 4500 in March and September on the 10th, and Water 500',
      };

      const result = SlotSchema.safeParse(expensesPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expenses).toHaveLength(3);
        expect(result.data.expenses?.[0].name).toBe('Rent');
        expect(result.data.expenses?.[0].amount).toBe(15000);
        expect(result.data.expenses?.[0].dayOfMonth).toBe(5);
        expect(result.data.expenses?.[1].months).toEqual([3, 9]);
        expect(result.data.expenses?.[2].dayOfMonth).toBeNull();
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

    describe('manage_expense extraction and validation', () => {
      it('marks incomplete: false when all expenses have names, amounts, and dayOfMonth', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            expenses: [
              { name: 'Rent', amount: 15000, dayOfMonth: 5, months: [] },
              { name: 'Internet', amount: 1899, dayOfMonth: 20, months: [] },
            ],
            standaloneQuery: 'Add Rent 15000 on the 5th and Internet 1899 on the 20th',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'Add Rent 15000 on the 5th and Internet 1899 on the 20th',
          undefined,
          'manage_expense',
        );

        expect(slots.incomplete).toBe(false);
        expect(slots.expenses).toHaveLength(2);
        expect(slots.expenses?.[0].name).toBe('Rent');
        expect(slots.expenses?.[0].dayOfMonth).toBe(5);
        expect(slots.expenses?.[1].name).toBe('Internet');
        expect(slots.expenses?.[1].dayOfMonth).toBe(20);
      });

      it('marks incomplete: true when expenses are missing dayOfMonth', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            expenses: [
              { name: 'Water', amount: 500, dayOfMonth: null, months: [] },
              { name: 'Electricity', amount: 2800, dayOfMonth: null, months: [] },
            ],
            standaloneQuery: 'Add Water 500 and Electricity 2800',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'Add Water 500 and Electricity 2800',
          undefined,
          'manage_expense',
        );

        expect(slots.incomplete).toBe(true);
        expect(slots.expenses).toHaveLength(2);
        expect(slots.expenses?.[0].dayOfMonth).toBeNull();
      });

      it('infers dayOfMonth from today when date is "today"', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            date: 'today',
            expenses: [
              { name: 'Gym', amount: 1500, dayOfMonth: null, months: [] },
            ],
            standaloneQuery: 'Add gym 1500 paid today',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'Add gym 1500 paid today',
          undefined,
          'manage_expense',
          '2026-11-16',
        );

        expect(slots.incomplete).toBe(false);
        expect(slots.expenses?.[0].dayOfMonth).toBe(16);
      });

      it('marks incomplete: true when no expenses could be extracted for manage_expense', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            expenses: null,
            standaloneQuery: 'I want to add some expenses',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'I want to add some expenses',
          undefined,
          'manage_expense',
        );

        expect(slots.incomplete).toBe(true);
      });

      it('extracts updateExpense and marks incomplete: false when targetName and newName are provided', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            searchName: 'water bill',
            updateExpense: {
              targetName: 'water bill',
              newName: 'Maynilad',
              amount: null,
              dayOfMonth: null,
              months: [],
            },
            standaloneQuery: 'update my water bill into Maynilad',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'update my water bill into Maynilad',
          undefined,
          'manage_expense',
        );

        expect(slots.incomplete).toBe(false);
        expect(slots.updateExpense?.targetName).toBe('water bill');
        expect(slots.updateExpense?.newName).toBe('Maynilad');
        expect(slots.searchName).toBe('water bill');
      });

      it('marks incomplete: true when updateExpense has targetName but no update values', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            searchName: 'water bill',
            updateExpense: {
              targetName: 'water bill',
              newName: null,
              amount: null,
              dayOfMonth: null,
              months: [],
            },
            standaloneQuery: 'update my water bill',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'update my water bill',
          undefined,
          'manage_expense',
        );

        expect(slots.incomplete).toBe(true);
      });
    });

    describe('manage_wishlist extraction', () => {
      it('extracts wishlist item and sets searchName and amount', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            wishlistItems: [{ name: 'Sony Headphones', amount: 15000, priority: 'important' }],
            standaloneQuery: 'Add Sony Headphones 15000 to wishlist',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'Add Sony Headphones 15000 to wishlist',
          undefined,
          'manage_wishlist',
        );

        expect(slots.incomplete).toBe(false);
        expect(slots.wishlistItems).toEqual([
          { name: 'Sony Headphones', amount: 15000, priority: 'important', description: null },
        ]);
        expect(slots.searchName).toBe('Sony Headphones');
        expect(slots.amount).toBe(15000);
      });

      it('normalizes searchName and amount into wishlistItems when candidateName is provided', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            searchName: 'Nike Shoes',
            amount: 4500,
            standaloneQuery: 'Add Nike Shoes 4500 to wishlist',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'Add Nike Shoes 4500 to wishlist',
          undefined,
          'manage_wishlist',
        );

        expect(slots.incomplete).toBe(false);
        expect(slots.wishlistItems).toEqual([
          { name: 'Nike Shoes', amount: 4500, priority: null, description: null },
        ]);
      });

      it('marks incomplete: true when wishlist item has no amount', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            wishlistItems: [{ name: 'Sony Headphones', amount: null, priority: null }],
            standaloneQuery: 'Add Sony Headphones to wishlist',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'Add Sony Headphones to wishlist',
          undefined,
          'manage_wishlist',
        );

        expect(slots.incomplete).toBe(true);
      });

      it('extracts updateWishlist with newName and amount and sets incomplete: false', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            updateWishlist: {
              targetName: 'Sony Headphones',
              newName: 'Sony WH-1000XM5',
              amount: 16500,
              priority: null,
              status: null,
              action: 'update',
            },
            standaloneQuery: 'Update Sony Headphones to Sony WH-1000XM5 and 16500',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'Update Sony Headphones to Sony WH-1000XM5 and 16500',
          undefined,
          'manage_wishlist',
        );

        expect(slots.incomplete).toBe(false);
        expect(slots.updateWishlist?.targetName).toBe('Sony Headphones');
        expect(slots.updateWishlist?.newName).toBe('Sony WH-1000XM5');
        expect(slots.updateWishlist?.amount).toBe(16500);
      });

      it('extracts updateWishlist with purchase action', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            updateWishlist: {
              targetName: 'Sony Headphones',
              newName: null,
              amount: null,
              priority: null,
              status: 'purchased',
              action: 'purchase',
            },
            standaloneQuery: 'I bought Sony Headphones, mark as purchased',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'I bought Sony Headphones, mark as purchased',
          undefined,
          'manage_wishlist',
        );

        expect(slots.incomplete).toBe(false);
        expect(slots.updateWishlist?.action).toBe('purchase');
        expect(slots.updateWishlist?.status).toBe('purchased');
      });

      it('extracts updateWishlist with delete action', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            updateWishlist: {
              targetName: 'Sony Headphones',
              newName: null,
              amount: null,
              priority: null,
              status: null,
              action: 'delete',
            },
            standaloneQuery: 'Remove Sony Headphones from wishlist',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'Remove Sony Headphones from wishlist',
          undefined,
          'manage_wishlist',
        );

        expect(slots.incomplete).toBe(false);
        expect(slots.updateWishlist?.action).toBe('delete');
      });

      it('extracts swapWishlist for swap_wishlist_priority', async () => {
        const mockInvoke = jest.fn().mockResolvedValue({
          content: JSON.stringify({
            swapWishlist: {
              item1Name: 'Sony Headphones',
              item2Name: 'Nike Shoes',
            },
            standaloneQuery: 'Swap priority between Sony Headphones and Nike Shoes',
          }),
        });
        mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

        const slots = await extractor.extract(
          'Swap priority between Sony Headphones and Nike Shoes',
          undefined,
          'swap_wishlist_priority',
        );

        expect(slots.incomplete).toBe(false);
        expect(slots.swapWishlist?.item1Name).toBe('Sony Headphones');
        expect(slots.swapWishlist?.item2Name).toBe('Nike Shoes');
      });
    });
  });
});
