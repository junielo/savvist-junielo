import { prepareActionNodeFactory } from './prepare-action.node';
import { AgentStateType } from '../agent.state';

describe('prepareActionNode', () => {
  let mockObservability: any;

  beforeEach(() => {
    mockObservability = {
      SetExecutedNode: jest.fn(),
    };
  });

  it('builds a fresh pending action and records to observability', async () => {
    const node = prepareActionNodeFactory({ observability: mockObservability });
    const state = {
      context: { today: '2026-10-31' },
      intentResult: { intent: 'manage_entry_record' },
      slots: { accountName: 'BDO Debit', amount: 35000, date: 'today' },
    } as any;

    const result = await node(state);

    expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('prepare-action');
    expect(result.pending_action).toBeDefined();
    expect(result.pending_action?.tool).toBe('update_balance');
    expect(result.pending_action?.risk).toBe('high');
    expect(result.pending_action?.args.entries).toEqual([
      { accountName: 'BDO Debit', amount: 35000 },
    ]);
    expect(result.messages?.[0].content).toContain('Would you like to record a balance of ₱35,000.00 for BDO Debit on 2026-10-31');
  });

  it('builds a formatted confirmation message for multi-account batch entries', async () => {
    const node = prepareActionNodeFactory({ observability: mockObservability });
    const state = {
      context: { today: '2026-11-16' },
      intentResult: { intent: 'manage_entry_record' },
      slots: {
        entries: [
          { accountName: 'BDO', amount: 45000 },
          { accountName: 'GCredit', amount: 11000 },
        ],
        date: 'today',
      },
    } as any;

    const result = await node(state);

    expect(result.pending_action?.args.entries).toHaveLength(2);
    expect(result.messages?.[0].content).toContain('BDO: ₱45,000.00');
    expect(result.messages?.[0].content).toContain('GCredit: ₱11,000.00');
  });

  it('handles 409 conflict loop and builds overwrite confirmation prompt', async () => {
    const node = prepareActionNodeFactory({ observability: mockObservability });
    const state = {
      context: { today: '2026-10-31' },
      intentResult: { intent: 'manage_entry_record' },
      pending_action: {
        tool: 'update_balance',
        intent: 'manage_entry_record',
        risk: 'high',
        args: { accountName: 'BDO Debit', amount: 35000, date: '2026-10-31' },
        conflict: {
          existingBalance: 30000,
          proposedBalance: 35000,
          accountName: 'BDO Debit',
          day: '2026-10-31',
        },
      },
    } as any;

    const result = await node(state);

    expect(result.pending_action?.confirmedReplace).toBe(true);
    expect(result.pending_action?.conflict).toBeNull();
    expect(result.messages?.[0].content).toContain('An existing balance of ₱30,000.00 is already recorded');
    expect(result.messages?.[0].content).toContain('replace it with ₱35,000.00?');
  });

  it('handles multi-conflict array loop and builds list overwrite prompt', async () => {
    const node = prepareActionNodeFactory({ observability: mockObservability });
    const state = {
      context: { today: '2026-11-16' },
      intentResult: { intent: 'manage_entry_record' },
      pending_action: {
        tool: 'update_balance',
        intent: 'manage_entry_record',
        risk: 'high',
        args: { date: '2026-11-16' },
        conflict: [
          { accountName: 'BDO', existingBalance: 35000, proposedBalance: 45000, day: '2026-11-16' },
          { accountName: 'GCredit', existingBalance: 5000, proposedBalance: 11000, day: '2026-11-16' },
        ],
      },
    } as any;

    const result = await node(state);

    expect(result.pending_action?.confirmedReplace).toBe(true);
    expect(result.messages?.[0].content).toContain('BDO: currently ₱35,000.00 (proposed: ₱45,000.00)');
    expect(result.messages?.[0].content).toContain('GCredit: currently ₱5,000.00 (proposed: ₱11,000.00)');
  });

  describe('update_base_salary actions', () => {
    it('prepares confirmation for base salary update with medium risk', async () => {
      const node = prepareActionNodeFactory({ observability: mockObservability });
      const state = {
        context: { today: '2026-11-16' },
        intentResult: { intent: 'update_base_salary' },
        slots: { baseSalary: 50000, isUnemployed: null },
      } as any;

      const result = await node(state);

      expect(result.pending_action?.tool).toBe('update_salary');
      expect(result.pending_action?.risk).toBe('medium');
      expect(result.pending_action?.args).toEqual({ baseSalary: 50000 });
      expect(result.messages?.[0].content).toContain('update your base salary to ₱50,000.00?');
    });

    it('prepares confirmation for setting status to unemployed', async () => {
      const node = prepareActionNodeFactory({ observability: mockObservability });
      const state = {
        context: { today: '2026-11-16' },
        intentResult: { intent: 'update_base_salary' },
        slots: { isUnemployed: true, baseSalary: 0 },
      } as any;

      const result = await node(state);

      expect(result.pending_action?.tool).toBe('update_salary');
      expect(result.pending_action?.risk).toBe('medium');
      expect(result.pending_action?.args).toEqual({ isUnemployed: true, baseSalary: 0 });
      expect(result.messages?.[0].content).toContain('update your employment status to unemployed (this will set your base salary to ₱0.00)?');
    });
  });

  describe('manage_expense actions', () => {
    it('prepares confirmation for a single expense with medium risk', async () => {
      const node = prepareActionNodeFactory({ observability: mockObservability });
      const state = {
        context: { today: '2026-11-16' },
        intentResult: { intent: 'manage_expense' },
        slots: {
          expenses: [{ name: 'Rent', amount: 15000, dayOfMonth: 5, months: [] }],
        },
      } as any;

      const result = await node(state);

      expect(result.pending_action?.tool).toBe('create_expense');
      expect(result.pending_action?.risk).toBe('medium');
      expect(result.pending_action?.args.expenses).toEqual([
        { name: 'Rent', amount: 15000, dayOfMonth: 5, months: [] },
      ]);
      expect(result.messages?.[0].content).toContain('Would you like to add the expense "Rent" for ₱15,000.00 (due every 5th)?');
    });

    it('prepares confirmation for multiple expenses with specific months formatted', async () => {
      const node = prepareActionNodeFactory({ observability: mockObservability });
      const state = {
        context: { today: '2026-11-16' },
        intentResult: { intent: 'manage_expense' },
        slots: {
          expenses: [
            { name: 'Rent', amount: 15000, dayOfMonth: 5, months: [] },
            { name: 'Car Insurance', amount: 4500, dayOfMonth: 10, months: [3, 9] },
          ],
        },
      } as any;

      const result = await node(state);

      expect(result.pending_action?.tool).toBe('create_expense');
      expect(result.pending_action?.args.expenses).toHaveLength(2);
      expect(result.messages?.[0].content).toContain('- Rent: ₱15,000.00 (due every 5th)');
      expect(result.messages?.[0].content).toContain('- Car Insurance: ₱4,500.00 (due every 10th in Mar, Sep)');
    });

    it('prepares confirmation for updating an existing expense and resolves name via writeTool', async () => {
      const mockWriteTool = {
        resolveExpense: jest.fn().mockResolvedValue({
          _id: '6adf58efb1a87dfd54b8d3b1',
          name: 'water',
          amount: 500,
          dayOfMonth: 10,
        }),
      };
      const node = prepareActionNodeFactory({
        observability: mockObservability,
        writeTool: mockWriteTool as any,
      });
      const state = {
        context: { userId: '6adf58efb1a87dfd54b8d3a3', today: '2026-11-16' },
        intentResult: { intent: 'manage_expense' },
        slots: {
          updateExpense: {
            targetName: 'water bill',
            newName: 'Maynilad',
          },
        },
      } as any;

      const result = await node(state);

      expect(mockWriteTool.resolveExpense).toHaveBeenCalledWith(
        expect.anything(),
        'water bill',
      );
      expect(result.pending_action?.tool).toBe('update_expense');
      expect(result.pending_action?.risk).toBe('medium');
      expect(result.pending_action?.args.targetName).toBe('water');
      expect(result.pending_action?.args.newName).toBe('Maynilad');
      expect(result.pending_action?.args.amount).toBe(500);
      expect(result.pending_action?.args.dayOfMonth).toBe(10);
      expect(result.pending_action?.args.previousAmount).toBe(500);
      expect(result.pending_action?.args.previousDayOfMonth).toBe(10);
      expect(result.messages?.[0].content).toBe(
        'Would you like to update the expense "water" (₱500.00, due every 10th) to rename it to "Maynilad"? Reply "yes" to confirm or "no" to cancel.',
      );
      expect(result.awaiting_clarification).toBeNull();
    });
  });

  describe('manage_wishlist actions', () => {
    it('prepares confirmation for creating a single wishlist item with priority', async () => {
      const node = prepareActionNodeFactory({ observability: mockObservability });
      const state = {
        context: { today: '2026-11-16' },
        intentResult: { intent: 'manage_wishlist' },
        slots: {
          wishlistItems: [{ name: 'Sony Headphones', amount: 15000, priority: 'important' }],
        },
      } as any;

      const result = await node(state);

      expect(result.pending_action?.tool).toBe('create_wishlist');
      expect(result.pending_action?.risk).toBe('medium');
      expect(result.pending_action?.args.items).toEqual([
        { name: 'Sony Headphones', amount: 15000, priority: 'important' },
      ]);
      expect(result.messages?.[0].content).toContain(
        'Would you like to add "Sony Headphones" for ₱15,000.00 (important priority) to your wishlist? Reply "yes" to confirm or "no" to cancel.',
      );
    });

    it('prepares confirmation for creating multiple wishlist items in a batch', async () => {
      const node = prepareActionNodeFactory({ observability: mockObservability });
      const state = {
        context: { today: '2026-11-16' },
        intentResult: { intent: 'manage_wishlist' },
        slots: {
          wishlistItems: [
            { name: 'Sony Headphones', amount: 15000, priority: 'priority' },
            { name: 'Nike Running Shoes', amount: 4500, priority: 'normal' },
          ],
        },
      } as any;

      const result = await node(state);

      expect(result.pending_action?.tool).toBe('create_wishlist');
      expect(result.pending_action?.args.items).toHaveLength(2);
      expect(result.messages?.[0].content).toContain('- Sony Headphones: ₱15,000.00 (priority priority)');
      expect(result.messages?.[0].content).toContain('- Nike Running Shoes: ₱4,500.00 (normal priority)');
    });

    it('prepares confirmation for updating an existing wishlist item', async () => {
      const mockWriteTool = {
        resolveWishlistItem: jest.fn().mockResolvedValue({
          _id: '6adf58efb1a87dfd54b8d3b1',
          name: 'Sony Headphones',
          amount: 15000,
          priority: 'important',
        }),
      };
      const node = prepareActionNodeFactory({
        observability: mockObservability,
        writeTool: mockWriteTool as any,
      });
      const state = {
        context: { userId: '6adf58efb1a87dfd54b8d3a3', today: '2026-11-16' },
        intentResult: { intent: 'manage_wishlist' },
        slots: {
          updateWishlist: {
            targetName: 'Sony Headphones',
            newName: 'Sony WH-1000XM5',
            amount: 16500,
          },
        },
      } as any;

      const result = await node(state);

      expect(mockWriteTool.resolveWishlistItem).toHaveBeenCalledWith(
        expect.anything(),
        'Sony Headphones',
      );
      expect(result.pending_action?.tool).toBe('update_wishlist');
      expect(result.pending_action?.risk).toBe('medium');
      expect(result.pending_action?.args.targetName).toBe('Sony Headphones');
      expect(result.pending_action?.args.newName).toBe('Sony WH-1000XM5');
      expect(result.pending_action?.args.amount).toBe(16500);
      expect(result.messages?.[0].content).toContain('rename it to "Sony WH-1000XM5" and set price to ₱16,500.00');
    });

    it('prepares confirmation for marking a wishlist item as purchased', async () => {
      const mockWriteTool = {
        resolveWishlistItem: jest.fn().mockResolvedValue({
          _id: '6adf58efb1a87dfd54b8d3b1',
          name: 'Sony Headphones',
          amount: 15000,
          priority: 'important',
        }),
      };
      const node = prepareActionNodeFactory({
        observability: mockObservability,
        writeTool: mockWriteTool as any,
      });
      const state = {
        context: { userId: '6adf58efb1a87dfd54b8d3a3', today: '2026-11-16' },
        intentResult: { intent: 'manage_wishlist' },
        slots: {
          updateWishlist: {
            targetName: 'Sony Headphones',
            action: 'purchase',
          },
        },
      } as any;

      const result = await node(state);

      expect(result.pending_action?.tool).toBe('purchase_wishlist');
      expect(result.messages?.[0].content).toContain(
        'Would you like to mark the wishlist item "Sony Headphones" (₱15,000.00) as purchased? Reply "yes" to confirm or "no" to cancel.',
      );
    });

    it('prepares confirmation for removing a wishlist item', async () => {
      const mockWriteTool = {
        resolveWishlistItem: jest.fn().mockResolvedValue({
          _id: '6adf58efb1a87dfd54b8d3b1',
          name: 'Sony Headphones',
          amount: 15000,
          priority: 'important',
        }),
      };
      const node = prepareActionNodeFactory({
        observability: mockObservability,
        writeTool: mockWriteTool as any,
      });
      const state = {
        context: { userId: '6adf58efb1a87dfd54b8d3a3', today: '2026-11-16' },
        intentResult: { intent: 'manage_wishlist' },
        slots: {
          updateWishlist: {
            targetName: 'Sony Headphones',
            action: 'delete',
          },
        },
      } as any;

      const result = await node(state);

      expect(result.pending_action?.tool).toBe('delete_wishlist');
      expect(result.messages?.[0].content).toContain(
        'Would you like to remove the wishlist item "Sony Headphones" (₱15,000.00) from your wishlist? Reply "yes" to confirm or "no" to cancel.',
      );
    });

    it('prepares confirmation for swapping priorities between two items', async () => {
      const node = prepareActionNodeFactory({ observability: mockObservability });
      const state = {
        context: { today: '2026-11-16' },
        intentResult: { intent: 'swap_wishlist_priority' },
        slots: {
          swapWishlist: {
            item1Name: 'Sony Headphones',
            item2Name: 'Nike Shoes',
          },
        },
      } as any;

      const result = await node(state);

      expect(result.pending_action?.tool).toBe('swap_wishlist_priority');
      expect(result.pending_action?.args).toEqual({
        item1Name: 'Sony Headphones',
        item2Name: 'Nike Shoes',
      });
      expect(result.messages?.[0].content).toContain(
        'Would you like to swap priorities between "Sony Headphones" and "Nike Shoes" on your wishlist? Reply "yes" to confirm or "no" to cancel.',
      );
    });
  });
});
