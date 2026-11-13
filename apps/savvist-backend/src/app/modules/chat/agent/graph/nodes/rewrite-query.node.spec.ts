import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { rewriteQueryNodeFactory } from './rewrite-query.node';
import { QueryRewriter } from '../../llm/query-rewriter';
import { ObservabilityService } from '../../observability/observability.service';

describe('rewriteQueryNode', () => {
  let mockQueryRewriter: Partial<QueryRewriter>;
  let mockObservability: ObservabilityService;

  beforeEach(() => {
    mockQueryRewriter = {
      rewrite: jest.fn().mockResolvedValue('What is my most expensive expense?'),
    };
    mockObservability = new ObservabilityService();
    jest.spyOn(mockObservability, 'SetExecutedNode').mockImplementation();
  });

  it('calls queryRewriter when recent history exists', async () => {
    const node = rewriteQueryNodeFactory({
      queryRewriter: mockQueryRewriter as QueryRewriter,
      observability: mockObservability,
    });

    const state = {
      messages: [
        new HumanMessage('What is my most expensive wishlist item?'),
        new AIMessage('Qatar Budget'),
        new HumanMessage('what about my expenses?'),
      ],
    } as any;

    const result = await node(state);

    expect(result.rewrittenQuery).toBe('What is my most expensive expense?');
    expect(mockQueryRewriter.rewrite).toHaveBeenCalledWith(
      'what about my expenses?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'What is my most expensive wishlist item?' }),
      ]),
    );
    expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('rewrite-query');
  });

  it('bypasses rewriter if no prior history exists', async () => {
    const node = rewriteQueryNodeFactory({
      queryRewriter: mockQueryRewriter as QueryRewriter,
      observability: mockObservability,
    });

    const state = {
      messages: [new HumanMessage('What are my expenses?')],
    } as any;

    const result = await node(state);

    expect(result.rewrittenQuery).toBe('What are my expenses?');
    expect(mockQueryRewriter.rewrite).not.toHaveBeenCalled();
  });
});
