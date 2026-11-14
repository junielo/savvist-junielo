import { stateGuardNode } from './state-guard.node';
import { ObservabilityService } from '../../observability/observability.service';
import { AgentStateType } from '../agent.state';

describe('stateGuardNode', () => {
  let mockObservability: ObservabilityService;

  beforeEach(() => {
    mockObservability = new ObservabilityService();
    jest.spyOn(mockObservability, 'SetExecutedNode').mockImplementation();
  });

  it('resets leftovers including rewrittenQuery and readResult for a new request', async () => {
    const node = stateGuardNode({ observability: mockObservability });
    const state = {
      awaiting_clarification: null,
      intentResult: { intent: 'read_expenses' },
      slots: { month: 11 },
      readResult: { some: 'data' },
      rewrittenQuery: 'Stale rewritten query from previous turn',
      clarification_turns: 1,
    } as unknown as AgentStateType;

    const result = await node(state);

    expect(result).toEqual({
      intentResult: null,
      slots: null,
      readResult: null,
      rewrittenQuery: null,
      clarification_turns: 0,
    });
    expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('stateGuardNode');
  });

  it('preserves state when awaiting clarification within the turn limit', async () => {
    const node = stateGuardNode({ maxClarificationTurns: 2 });
    const state = {
      awaiting_clarification: 'searchName',
      clarification_turns: 1,
      intentResult: { intent: 'read_expenses' },
      slots: { month: 11 },
    } as unknown as AgentStateType;

    const result = await node(state);

    expect(result).toEqual({});
  });

  it('wipes state when clarification turns exceed the limit', async () => {
    const node = stateGuardNode({ maxClarificationTurns: 2 });
    const state = {
      awaiting_clarification: 'searchName',
      clarification_turns: 3,
      intentResult: { intent: 'read_expenses' },
      slots: { month: 11 },
      readResult: { some: 'data' },
      rewrittenQuery: 'Stale rewritten query',
    } as unknown as AgentStateType;

    const result = await node(state);

    expect(result).toEqual({
      awaiting_clarification: null,
      clarification_turns: 0,
      intentResult: null,
      slots: null,
      readResult: null,
      rewrittenQuery: null,
    });
  });
});
