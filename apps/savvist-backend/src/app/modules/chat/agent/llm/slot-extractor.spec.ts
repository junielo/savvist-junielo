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
        },
      };

      const result = SlotSchema.safeParse(wishlistPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.readArgs?.filters[0].field).toBe('status');
        expect(result.data.readArgs?.filters[0].value).toBe('purchased');
        expect(result.data.readArgs?.period).toBeFalsy();
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
