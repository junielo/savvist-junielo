import { clarifyNodeFactory } from './clarify.node';
import { AgentStateType } from '../agent.state';

describe('clarifyNode', () => {
  let mockObservability: any;

  beforeEach(() => {
    mockObservability = {
      SetExecutedNode: jest.fn(),
    };
  });

  it('records clarify node execution via observability', async () => {
    const node = clarifyNodeFactory({ observability: mockObservability });
    const state = {} as AgentStateType;

    await node(state);

    expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('clarify');
  });

  it('formulates tailored clarification when intent is ambiguous between read_balances and manage_entry_record', async () => {
    const node = clarifyNodeFactory({ observability: mockObservability });
    const state = {
      intentResult: {
        intent: 'read_balances',
        runnerUp: { intent: 'manage_entry_record', probability: 0.26 },
        probabilities: {
          read_balances: 0.54,
          manage_entry_record: 0.26,
        },
      },
    } as any;

    const result = await node(state);

    expect(result.awaiting_clarification).toBe(
      'Did you want to check if your account balances have been entered for today, or would you like to record new account balances?',
    );
  });

  it('formulates incomplete slots clarification when slots are incomplete', async () => {
    const node = clarifyNodeFactory({ observability: mockObservability });
    const state = {
      slots: { incomplete: true },
    } as any;

    const result = await node(state);

    expect(result.awaiting_clarification).toBe(
      'Could you provide more details so I can find what you are looking for?',
    );
  });

  it('formulates balance entry clarification when slots are incomplete for manage_entry_record', async () => {
    const node = clarifyNodeFactory({ observability: mockObservability });
    const state = {
      intentResult: { intent: 'manage_entry_record' },
      slots: { incomplete: true },
    } as any;

    const result = await node(state);

    expect(result.awaiting_clarification).toBe(
      'Which account and balance would you like to record? (For example: BDO 45,000, GCredit 11,000)',
    );
  });

  it('formulates salary clarification when slots are incomplete for update_base_salary', async () => {
    const node = clarifyNodeFactory({ observability: mockObservability });
    const state = {
      intentResult: { intent: 'update_base_salary' },
      slots: { incomplete: true },
    } as any;

    const result = await node(state);

    expect(result.awaiting_clarification).toBe(
      'What is your new base salary amount, or would you like to set your status to unemployed?',
    );
  });

  it('falls back to default clarification prompt when no specific ambiguity is detected', async () => {
    const node = clarifyNodeFactory({ observability: mockObservability });
    const state = {
      intentResult: {
        intent: 'unknown',
        group: 'unknown',
      },
    } as any;

    const result = await node(state);

    expect(result.awaiting_clarification).toBe(
      "I'm not quite sure I caught that. Could you tell me what you'd like to do with your balances, expenses, wishlist, or reminders?",
    );
  });
});
