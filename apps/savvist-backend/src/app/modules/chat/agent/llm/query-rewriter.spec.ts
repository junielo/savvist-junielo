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
});
