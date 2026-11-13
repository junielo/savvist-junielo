import { capabilityCheckNodeFactory } from './capability-check.node';
import { blockedNodeFactory } from './blocked.node';
import { HumanMessage } from '@langchain/core/messages';

describe('capability-check.node & blocked.node', () => {
  let mockObservability: any;
  let mockCapabilityService: any;

  beforeEach(() => {
    mockObservability = {
      SetExecutedNode: jest.fn(),
      setExecutedNode: jest.fn(),
    };
    mockCapabilityService = {
      check: jest.fn(),
    };
  });

  describe('capabilityCheckNode', () => {
    it('calls SetExecutedNode and updates state with capabilityCheck result', async () => {
      mockCapabilityService.check.mockResolvedValue({
        blocked: true,
        reason: 'Test blocked reason',
      });

      const node = capabilityCheckNodeFactory({
        capabilityService: mockCapabilityService,
        observability: mockObservability,
      });

      const state: any = {
        messages: [new HumanMessage('buy crypto')],
        intentResult: { intent: 'read_expenses', group: 'read' },
        context: { today: '2026-11-09', timeZone: 'Asia/Manila' },
        slots: {},
      };

      const result = await node(state);

      expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('capability-check');
      expect(result.intentResult?.capabilityCheck?.blocked).toBe(true);
      expect(result.intentResult?.capabilityCheck?.reason).toBe('Test blocked reason');
    });
  });

  describe('blockedNode', () => {
    it('calls SetExecutedNode and keeps existing reason if set', async () => {
      const node = blockedNodeFactory({
        observability: mockObservability,
      });

      const state: any = {
        intentResult: {
          capabilityCheck: { blocked: true, reason: 'Already blocked reason' },
        },
      };

      const result = await node(state);

      expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('blocked');
      expect(result).toEqual({});
    });

    it('supplies default refusal if reason is missing', async () => {
      const node = blockedNodeFactory({
        observability: mockObservability,
      });

      const state: any = {
        intentResult: {
          capabilityCheck: { blocked: true },
        },
      };

      const result = await node(state);

      expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('blocked');
      expect(result.intentResult?.capabilityCheck?.reason).toBeDefined();
    });
  });
});
