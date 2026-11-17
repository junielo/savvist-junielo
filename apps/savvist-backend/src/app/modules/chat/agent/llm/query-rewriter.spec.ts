import { QueryRewriter } from './query-rewriter';
import { GeminiService } from './gemini.service';
import { ObservabilityService } from '../observability/observability.service';

describe('QueryRewriter', () => {
  let rewriter: QueryRewriter;
  let mockGeminiService: { getModel: jest.Mock };
  let mockObservability: ObservabilityService;

  beforeEach(() => {
    mockGeminiService = { getModel: jest.fn() };
    mockObservability = new ObservabilityService();
    jest.spyOn(mockObservability, 'setLLMCall').mockImplementation();

    rewriter = new QueryRewriter(
      mockGeminiService as unknown as GeminiService,
      mockObservability,
    );
  });

  it('rewrites elliptical queries into self-contained questions', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content: 'What is my most expensive expense?',
    });
    mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

    const history = [
      { role: 'user' as const, text: 'What is my most expensive wishlist item?' },
      { role: 'assistant' as const, text: 'Qatar Budget' },
    ];

    const result = await rewriter.rewrite('what about my expenses?', history);

    expect(result).toBe('What is my most expensive expense?');
    expect(mockInvoke).toHaveBeenCalledWith(expect.stringContaining('Qatar Budget'));
    expect(mockObservability.setLLMCall).toHaveBeenCalledWith(
      'query-rewriter',
      expect.objectContaining({
        message: 'what about my expenses?',
        rewritten: 'What is my most expensive expense?',
      }),
    );
  });

  it('falls back to the original message if model invocation fails', async () => {
    mockGeminiService.getModel.mockReturnValue({
      invoke: jest.fn().mockRejectedValue(new Error('Network error')),
    });

    const result = await rewriter.rewrite('what about my expenses?', 'none');

    expect(result).toBe('what about my expenses?');
    expect(mockObservability.setLLMCall).toHaveBeenCalledWith(
      'query-rewriter',
      expect.objectContaining({
        message: 'what about my expenses?',
        rewritten: 'what about my expenses?',
      }),
    );
  });

  describe('extractSecondaryQuery', () => {
    it('extracts the secondary query using Gemini model', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({
        content: 'show me all the list of my expense',
      });
      mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

      const result = await rewriter.extractSecondaryQuery(
        'yes please and also, show me all the list of my expense',
      );

      expect(result).toBe('show me all the list of my expense');
    });

    it('falls back to string stripping if Gemini model fails', async () => {
      mockGeminiService.getModel.mockReturnValue({
        invoke: jest.fn().mockRejectedValue(new Error('Gemini offline')),
      });

      const result = await rewriter.extractSecondaryQuery(
        'yes please and also, show me all the list of my expense',
      );

      expect(result).toBe('show me all the list of my expense');
    });
  });

  describe('splitCompoundQueries', () => {
    it('returns array directly if no conjunctions are present', async () => {
      const result = await rewriter.splitCompoundQueries('how much is my rent?');
      expect(result).toEqual(['how much is my rent?']);
      expect(mockGeminiService.getModel).not.toHaveBeenCalled();
    });

    it('splits compound queries using Gemini model', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({
        content: JSON.stringify([
          'Update Meralco bill amount to 4500',
          'display all expenses',
        ]),
      });
      mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

      const result = await rewriter.splitCompoundQueries(
        'Update Meralco bill amount to 4500 then display all expenses',
      );

      expect(result).toEqual([
        'Update Meralco bill amount to 4500',
        'display all expenses',
      ]);
    });

    it('falls back to single array if Gemini model returns invalid JSON', async () => {
      mockGeminiService.getModel.mockReturnValue({
        invoke: jest.fn().mockResolvedValue({ content: 'Invalid json response' }),
      });

      const result = await rewriter.splitCompoundQueries(
        'show my expenses and show my wishlist',
      );

      expect(result).toEqual(['show my expenses and show my wishlist']);
    });
  });
});
