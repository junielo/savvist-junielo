/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReplyWriter } from './reply-writer';

describe('ReplyWriter', () => {
  let replyWriter: ReplyWriter;
  let mockGeminiService: any;
  let mockObservability: any;

  beforeEach(() => {
    mockObservability = {
      setLLMCall: jest.fn(),
    };
    mockGeminiService = {
      getModel: jest.fn(),
    };
    replyWriter = new ReplyWriter(mockGeminiService, mockObservability);
  });

  it('strips leading "Hello, I\'m Savvist." greeting from LLM response', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content:
        'Hello, I\'m Savvist. Based on your pending items, you have 1 item: "Qatar Budget" with an amount of 120000.',
    });
    mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

    const reply = await replyWriter.writeReply('read_wishlist', {}, 'show pending');

    expect(reply).not.toContain("Hello, I'm Savvist");
    expect(reply).toBe(
      'Based on your pending items, you have 1 item: "Qatar Budget" with an amount of 120000.',
    );
  });

  it('strips "Hi, I am Savvist." variation from LLM response', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      content: 'Hi, I am Savvist. You have 3 expenses due this month.',
    });
    mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

    const reply = await replyWriter.writeReply('read_expenses', {}, 'show expenses');

    expect(reply).toBe('You have 3 expenses due this month.');
  });

  it('formats wishlist aggregation reply accurately', async () => {
    const aggregateData = {
      found: true,
      aggregate: {
        groupBy: 'month',
        metric: 'sum',
        overallTotal: 12500,
        groups: [
          { key: '2026-09', value: 8000, count: 1, items: ['Headphones'] },
          { key: '2026-10', value: 4500, count: 1, items: ['Keyboard'] },
        ],
      },
    };

    const mockInvoke = jest.fn().mockResolvedValue({
      content:
        'You purchased 1 item in September 2026 totaling 8,000, and 1 item in October 2026 totaling 4,500, for an overall total of 12,500.',
    });
    mockGeminiService.getModel.mockReturnValue({ invoke: mockInvoke });

    const reply = await replyWriter.writeReply(
      'read_wishlist',
      aggregateData,
      'what is the total purchased wishlist item that I purchased each month?',
    );

    expect(reply).toContain('September 2026');
    expect(reply).toContain('October 2026');
    expect(reply).toContain('12,500');
  });
});
