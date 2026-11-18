import { applyStateGuards } from './state-guards';
import type { IntentResult } from './intent.types';
import type { AgentStateType } from '../graph/agent.state';

describe('state-guards', () => {
  const baseResult = (intent: string, group = 'read', confidence = 0.85): IntentResult => ({
    intent: intent as any,
    group: group as any,
    confidence,
    runnerUp: null,
    probabilities: { [intent]: confidence },
    source: 'jev',
    secondary: [],
  });

  const mockState = (pending_action: any = null): AgentStateType =>
    ({
      messages: [],
      intentResult: null,
      slots: null,
      readResult: null,
      writeResult: null,
      pending_action,
      awaiting_clarification: null,
      context: null,
      clarification_turns: 0,
      rewrittenQuery: null,
      queued_queries: [],
    } as any);

  it('preserves intent when state invariants are satisfied', () => {
    const initial = baseResult('read_wishlist', 'read');
    const state = mockState();

    const result = applyStateGuards(initial, state);

    expect(result.intent).toBe('read_wishlist');
    expect(result.group).toBe('read');
  });
});
