import { resolveConfirmationNodeFactory } from './resolve-confirmation.node';
import { HumanMessage } from '@langchain/core/messages';

describe('resolveConfirmationNode', () => {
  let mockObservability: any;
  let mockJevClient: any;

  beforeEach(() => {
    mockObservability = {
      SetExecutedNode: jest.fn(),
    };
    mockJevClient = {
      resolveConfirmationResponse: jest.fn(),
    };
  });

  const basePending = {
    tool: 'update_balance',
    intent: 'manage_entry_record',
    risk: 'high' as const,
    args: { accountName: 'BDO Debit', amount: 35000, date: '2026-10-31' },
    description: 'Record 35000 for BDO?',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 600000).toISOString(),
  };

  it('resolves affirmative answer to confirm using Jev', async () => {
    mockJevClient.resolveConfirmationResponse.mockResolvedValueOnce({
      resolution: 'confirm',
      confidence: 0.98,
      hasSecondaryRequest: false,
    });
    const node = resolveConfirmationNodeFactory({
      observability: mockObservability,
      jevClient: mockJevClient,
    });
    const state = {
      pending_action: basePending,
      messages: [new HumanMessage('yes, please proceed')],
    } as any;

    const result = await node(state);

    expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('resolve-confirmation');
    expect(mockJevClient.resolveConfirmationResponse).toHaveBeenCalledWith(
      'yes, please proceed',
      basePending.description,
    );
    expect(result.pending_action?.resolution).toBe('confirm');
  });

  it('resolves negative answer to deny using Jev', async () => {
    mockJevClient.resolveConfirmationResponse.mockResolvedValueOnce({
      resolution: 'deny',
      confidence: 0.95,
      hasSecondaryRequest: false,
    });
    const node = resolveConfirmationNodeFactory({
      observability: mockObservability,
      jevClient: mockJevClient,
    });
    const state = {
      pending_action: basePending,
      messages: [new HumanMessage('no, cancel it')],
    } as any;

    const result = await node(state);

    expect(result.pending_action?.resolution).toBe('deny');
  });

  it('resolves correction statement to correction using Jev', async () => {
    mockJevClient.resolveConfirmationResponse.mockResolvedValueOnce({
      resolution: 'correction',
      confidence: 0.92,
      hasSecondaryRequest: false,
    });
    const node = resolveConfirmationNodeFactory({
      observability: mockObservability,
      jevClient: mockJevClient,
    });
    const state = {
      pending_action: basePending,
      messages: [new HumanMessage('actually make it 40000')],
    } as any;

    const result = await node(state);

    expect(result.pending_action?.resolution).toBe('correction');
  });

  it('cancels action when expiresAt is in the past without calling Jev', async () => {
    const node = resolveConfirmationNodeFactory({
      observability: mockObservability,
      jevClient: mockJevClient,
    });
    const state = {
      pending_action: {
        ...basePending,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
      messages: [new HumanMessage('yes')],
    } as any;

    const result = await node(state);

    expect(result.pending_action?.resolution).toBe('cancel');
    expect(mockJevClient.resolveConfirmationResponse).not.toHaveBeenCalled();
  });

  describe('with JevClient natural phrasing', () => {
    it('uses Jev to resolve natural phrasing like "Looks good, go for it" to confirm', async () => {
      mockJevClient.resolveConfirmationResponse.mockResolvedValueOnce({
        resolution: 'confirm',
        confidence: 0.98,
        hasSecondaryRequest: false,
      });
      const node = resolveConfirmationNodeFactory({
        observability: mockObservability,
        jevClient: mockJevClient,
      });
      const state = {
        pending_action: basePending,
        messages: [new HumanMessage('Looks good, go for it')],
      } as any;

      const result = await node(state);

      expect(mockJevClient.resolveConfirmationResponse).toHaveBeenCalledWith(
        'Looks good, go for it',
        basePending.description,
      );
      expect(result.pending_action?.resolution).toBe('confirm');
    });

    it('uses Jev to resolve natural phrasing like "Abort that" to deny', async () => {
      mockJevClient.resolveConfirmationResponse.mockResolvedValueOnce({
        resolution: 'deny',
        confidence: 0.95,
        hasSecondaryRequest: false,
      });
      const node = resolveConfirmationNodeFactory({
        observability: mockObservability,
        jevClient: mockJevClient,
      });
      const state = {
        pending_action: basePending,
        messages: [new HumanMessage('Abort that')],
      } as any;

      const result = await node(state);

      expect(result.pending_action?.resolution).toBe('deny');
    });
  });
});
