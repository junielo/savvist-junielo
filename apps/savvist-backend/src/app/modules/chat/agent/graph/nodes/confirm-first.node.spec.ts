import { confirmFirstNodeFactory } from './confirm-first.node';
import { AgentStateType } from '../agent.state';

jest.mock('@langchain/langgraph', () => ({
  interrupt: jest.fn().mockReturnValue('yes'),
}));

describe('confirmFirstNode', () => {
  let mockObservability: any;

  beforeEach(() => {
    mockObservability = {
      SetExecutedNode: jest.fn(),
    };
  });

  it('records confirm-first execution via observability and handles interrupt', async () => {
    const node = confirmFirstNodeFactory({ observability: mockObservability });
    const state = {
      pending_action: { tool: 'update_balance' },
    } as AgentStateType;

    const result = await node(state);

    expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('confirm-first');
    expect(result.messages?.[0].content).toBe('yes');
  });
});
