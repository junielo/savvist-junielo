import { clarifyNodeFactory } from './clarify.node';
import { AgentStateType } from '../agent.state';

describe('clarifyNode', () => {
  let mockObservability: any;
  let node: ReturnType<typeof clarifyNodeFactory>;

  beforeEach(() => {
    mockObservability = {
      SetExecutedNode: jest.fn(),
    };
    node = clarifyNodeFactory({ observability: mockObservability });
  });

  it('formulates tailored clarification when intent is ambiguous between read_balances and manage_entry_record', async () => {
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
    const state = {
      slots: { incomplete: true },
    } as any;

    const result = await node(state);

    expect(result.awaiting_clarification).toBe(
      'Could you provide more details so I can find what you are looking for?',
    );
  });

  it('formulates balance entry clarification when slots are incomplete for manage_entry_record', async () => {
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
    const state = {
      intentResult: { intent: 'update_base_salary' },
      slots: { incomplete: true },
    } as any;

    const result = await node(state);

    expect(result.awaiting_clarification).toBe(
      'What is your new base salary amount, or would you like to set your status to unemployed?',
    );
  });

  describe('manage_expense clarification', () => {
    it('formulates template guide clarification when no expenses provided', async () => {
        const state = {
        intentResult: { intent: 'manage_expense' },
        slots: { incomplete: true, expenses: [] },
      } as any;

      const result = await node(state);

      expect(result.awaiting_clarification).toContain('You can list one or several expenses');
      expect(result.awaiting_clarification).toContain('Rent 15000 on the 5th, PLDT 1899 on the 20th');
    });

    it('formulates delta clarification when expenses are missing dayOfMonth', async () => {
        const state = {
        intentResult: { intent: 'manage_expense' },
        slots: {
          incomplete: true,
          expenses: [
            { name: 'Water', amount: 500, dayOfMonth: null },
            { name: 'Electricity', amount: 2800, dayOfMonth: 18 },
          ],
        },
      } as any;

      const result = await node(state);

      expect(result.awaiting_clarification).toContain('I have the following expense details, but I just need the monthly due day(s):');
      expect(result.awaiting_clarification).toContain('- Water: ₱500.00 — What day of the month is this due?');
      expect(result.awaiting_clarification).toContain('- Electricity: ₱2,800.00 (due every 18th)');
    });

    it('formulates update clarification when target expense is known but changes are missing', async () => {
        const state = {
        intentResult: { intent: 'manage_expense' },
        slots: {
          incomplete: true,
          updateExpense: { targetName: 'water bill', newName: null, amount: null, dayOfMonth: null, months: [] },
        },
      } as any;

      const result = await node(state);

      expect(result.awaiting_clarification).toBe(
        'What would you like to update for "water bill"? You can change its name, amount, or recurring due day.',
      );
    });

    it('asks which expense to update when targetName is missing', async () => {
        const state = {
        intentResult: { intent: 'manage_expense' },
        slots: {
          incomplete: true,
          updateExpense: { targetName: '', newName: 'Maynilad' },
        },
      } as any;

      const result = await node(state);

      expect(result.awaiting_clarification).toBe(
        'Which expense would you like to update, and what would you like to change?',
      );
    });
  });

  describe('manage_wishlist clarification', () => {
    it('formulates template guide clarification when no wishlist items provided', async () => {
        const state = {
        intentResult: { intent: 'manage_wishlist' },
        slots: { incomplete: true, wishlistItems: [] },
      } as any;

      const result = await node(state);

      expect(result.awaiting_clarification).toContain('You can list one or several wishlist items');
      expect(result.awaiting_clarification).toContain('Sony Headphones 15000 (priority), Nike Shoes 4500');
    });

    it('formulates price clarification when wishlist item is missing amount', async () => {
        const state = {
        intentResult: { intent: 'manage_wishlist' },
        slots: {
          incomplete: true,
          wishlistItems: [{ name: 'Sony Headphones', amount: null }],
        },
      } as any;

      const result = await node(state);

      expect(result.awaiting_clarification).toBe(
        'What is the estimated cost or price for "Sony Headphones"?',
      );
    });

    it('formulates update clarification when target wishlist item is known but changes are missing', async () => {
        const state = {
        intentResult: { intent: 'manage_wishlist' },
        slots: {
          incomplete: true,
          updateWishlist: { targetName: 'Sony Headphones', newName: null, amount: null, priority: null },
        },
      } as any;

      const result = await node(state);

      expect(result.awaiting_clarification).toBe(
        'What would you like to update for "Sony Headphones"? You can change its name, amount, priority, mark it as purchased, or remove it.',
      );
    });

    it('asks which wishlist item to update or remove when targetName is missing', async () => {
        const state = {
        intentResult: { intent: 'manage_wishlist' },
        slots: {
          incomplete: true,
          updateWishlist: { targetName: '', newName: 'Sony WH-1000XM5' },
        },
      } as any;

      const result = await node(state);

      expect(result.awaiting_clarification).toBe(
        'Which wishlist item would you like to update or remove?',
      );
    });

    it('asks which two items to swap for swap_wishlist_priority', async () => {
        const state = {
        intentResult: { intent: 'swap_wishlist_priority' },
        slots: { incomplete: true },
      } as any;

      const result = await node(state);

      expect(result.awaiting_clarification).toBe(
        'Which two wishlist items would you like to swap priorities between?',
      );
    });
  });

  it('falls back to default clarification prompt when no specific ambiguity is detected', async () => {
    const state = {
      intentResult: {
        intent: 'unknown',
        group: 'unknown',
      },
    } as AgentStateType;

    const result = await node(state);

    expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('clarify');
    expect(result.awaiting_clarification).toBe(
      "I'm not quite sure I caught that. Could you tell me what you'd like to do with your balances, expenses, wishlist, or reminders?",
    );
  });
});
