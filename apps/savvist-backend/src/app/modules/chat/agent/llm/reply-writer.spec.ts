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
});
