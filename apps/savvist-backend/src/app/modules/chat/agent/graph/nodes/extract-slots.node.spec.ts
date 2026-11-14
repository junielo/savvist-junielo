import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { extractSlotsNodeFactory } from './extract-slots.node';
import { SlotExtractor } from '../../llm/slot-extractor';
import { ObservabilityService } from '../../observability/observability.service';
import { AgentStateType } from '../agent.state';

describe('extractSlotsNode', () => {
  let mockSlotExtractor: Partial<SlotExtractor>;
  let mockObservability: ObservabilityService;

  beforeEach(() => {
    mockSlotExtractor = {
      extract: jest.fn().mockResolvedValue({
        searchName: null,
        month: 11,
        limit: null,
        accountName: null,
        standaloneQuery: 'Extracted query',
      }),
    };
    mockObservability = new ObservabilityService();
    jest.spyOn(mockObservability, 'SetExecutedNode').mockImplementation();
  });

  it('uses lastUserMessage and ignores stale rewrittenQuery when isFollowUp is false', async () => {
    const node = extractSlotsNodeFactory({
      slotExtractor: mockSlotExtractor as SlotExtractor,
      observability: mockObservability,
    });

    const state = {
      messages: [
        new HumanMessage('What is my most expensive wishlist purchase each month?'),
        new AIMessage('Wifi Router for 6000'),
        new HumanMessage("what are my wishlist items that I haven't purchased yet?"),
      ],
      intentResult: {
        intent: 'read_wishlist',
        isFollowUp: false,
      },
      rewrittenQuery: 'What is my least expensive wishlist purchase each month?',
    } as unknown as AgentStateType;

    const result = await node(state);

    expect(mockSlotExtractor.extract).toHaveBeenCalledWith(
      "what are my wishlist items that I haven't purchased yet?",
      expect.any(Array),
      'read_wishlist',
    );
    expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('extract-slots');
    expect(result.slots?.standaloneQuery).toBe('Extracted query');
  });

  it('uses rewrittenQuery when isFollowUp is true and rewrittenQuery is present', async () => {
    const node = extractSlotsNodeFactory({
      slotExtractor: mockSlotExtractor as SlotExtractor,
      observability: mockObservability,
    });

    const state = {
      messages: [
        new HumanMessage('What is my most expensive wishlist purchase each month?'),
        new AIMessage('Wifi Router for 6000'),
        new HumanMessage('what about the least?'),
      ],
      intentResult: {
        intent: 'read_wishlist',
        isFollowUp: true,
      },
      rewrittenQuery: 'What is my least expensive wishlist purchase each month?',
    } as unknown as AgentStateType;

    const result = await node(state);

    expect(mockSlotExtractor.extract).toHaveBeenCalledWith(
      'What is my least expensive wishlist purchase each month?',
      expect.any(Array),
      'read_wishlist',
    );
    expect(result.slots).toBeDefined();
  });

  it('overrides standaloneQuery with rewrittenQuery when isFollowUp is true if standaloneQuery is empty or equal to lastUserMessage', async () => {
    mockSlotExtractor.extract = jest.fn().mockResolvedValue({
      searchName: null,
      month: 11,
      limit: null,
      accountName: null,
      standaloneQuery: 'what about the least?',
    });

    const node = extractSlotsNodeFactory({
      slotExtractor: mockSlotExtractor as SlotExtractor,
    });

    const state = {
      messages: [
        new HumanMessage('what about the least?'),
      ],
      intentResult: {
        intent: 'read_wishlist',
        isFollowUp: true,
      },
      rewrittenQuery: 'What is my least expensive wishlist purchase each month?',
    } as unknown as AgentStateType;

    const result = await node(state);

    expect(result.slots?.standaloneQuery).toBe(
      'What is my least expensive wishlist purchase each month?',
    );
  });

  it('provides default slots when slotExtractor is not provided', async () => {
    const node = extractSlotsNodeFactory({});

    const state = {
      messages: [new HumanMessage('How much are my expenses?')],
      intentResult: { intent: 'read_expenses', isFollowUp: false },
      rewrittenQuery: 'Stale query',
    } as unknown as AgentStateType;

    const result = await node(state);

    expect(result.slots).toEqual({
      searchName: null,
      month: null,
      limit: null,
      accountName: null,
      standaloneQuery: 'How much are my expenses?',
    });
  });
});
