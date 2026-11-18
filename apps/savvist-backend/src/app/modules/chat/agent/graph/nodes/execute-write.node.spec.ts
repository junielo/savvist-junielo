/* eslint-disable @typescript-eslint/no-explicit-any */
import { executeWriteNodeFactory } from './execute-write.node';
import { Types } from 'mongoose';
import { AgentStateType } from '../agent.state';

describe('executeWriteNode', () => {
  let mockWriteTool: any;
  let mockObservability: any;
  const userId = '6adf58efb1a87dfd54b8d3a3';

  beforeEach(() => {
    mockWriteTool = {
      updateBalance: jest.fn().mockResolvedValue({
        success: true,
        message: 'Successfully updated balance for BDO Debit.',
        record: {},
      }),
    };
    mockObservability = {
      SetExecutedNode: jest.fn(),
    };
  });

  it('calls writeTool.updateBalance and returns success writeResult', async () => {
    const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
    const state = {
      context: { userId },
      pending_action: {
        tool: 'update_balance',
        args: { accountName: 'BDO Debit', amount: 35000, date: '2026-10-31' },
        confirmedReplace: false,
      },
    } as any;

    const result = await node(state);

    expect(mockObservability.SetExecutedNode).toHaveBeenCalledWith('execute-write');
    expect(mockWriteTool.updateBalance).toHaveBeenCalledWith(
      new Types.ObjectId(userId),
      {
        accountName: 'BDO Debit',
        amount: 35000,
        date: '2026-10-31',
        confirmedReplace: false,
      },
    );
    expect(result.writeResult?.success).toBe(true);
    expect(result.writeResult?.message).toContain('Successfully updated balance');
    expect(result.pending_action).toBeNull();
  });

  it('updates pending_action with conflict details when conflict is returned', async () => {
    mockWriteTool.updateBalance.mockResolvedValue({
      conflict: true,
      existingBalance: 30000,
      proposedBalance: 35000,
      accountName: 'BDO Debit',
      day: '2026-10-31',
    });

    const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
    const state = {
      context: { userId },
      pending_action: {
        tool: 'update_balance',
        args: { accountName: 'BDO Debit', amount: 35000, date: '2026-10-31' },
        confirmedReplace: false,
      },
    } as any;

    const result = await node(state);

    expect(result.pending_action?.conflict).toEqual({
      existingBalance: 30000,
      proposedBalance: 35000,
      accountName: 'BDO Debit',
      day: '2026-10-31',
    });
    expect(result.writeResult).toBeUndefined();
  });

  it('calls writeTool.updateSalary for update_salary tool action', async () => {
    mockWriteTool.updateSalary = jest.fn().mockResolvedValue({
      success: true,
      message: 'Successfully updated your base salary to ₱50,000.00.',
    });

    const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
    const state = {
      context: { userId },
      pending_action: {
        tool: 'update_salary',
        intent: 'update_base_salary',
        args: { baseSalary: 50000 },
      },
    } as any;

    const result = await node(state);

    expect(mockWriteTool.updateSalary).toHaveBeenCalledWith(
      new Types.ObjectId(userId),
      { baseSalary: 50000, isUnemployed: undefined },
    );
    expect(result.writeResult?.success).toBe(true);
    expect(result.writeResult?.message).toContain('₱50,000.00');
    expect(result.pending_action).toBeNull();
  });

  describe('create_expense tool action', () => {
    it('calls writeTool.createExpense and returns success writeResult', async () => {
      mockWriteTool.createExpense = jest.fn().mockResolvedValue({
        success: true,
        message: 'Successfully added expense "Rent" for ₱15,000.00 (due every 5th).',
        records: [{ name: 'Rent', amount: 15000, dayOfMonth: 5 }],
      });

      const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
      const state = {
        context: { userId },
        pending_action: {
          tool: 'create_expense',
          intent: 'manage_expense',
          args: {
            expenses: [{ name: 'Rent', amount: 15000, dayOfMonth: 5, months: [] }],
          },
        },
      } as any;

      const result = await node(state);

      expect(mockWriteTool.createExpense).toHaveBeenCalledWith(
        new Types.ObjectId(userId),
        expect.objectContaining({
          expenses: [{ name: 'Rent', amount: 15000, dayOfMonth: 5, months: [] }],
        }),
      );
      expect(result.writeResult?.success).toBe(true);
      expect(result.writeResult?.message).toContain('Successfully added expense "Rent"');
      expect(result.pending_action).toBeNull();
    });

    it('returns error writeResult when createExpense returns error', async () => {
      mockWriteTool.createExpense = jest.fn().mockResolvedValue({
        error: 'Expense name cannot be empty.',
      });

      const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
      const state = {
        context: { userId },
        pending_action: {
          tool: 'create_expense',
          intent: 'manage_expense',
          args: {
            expenses: [{ name: '', amount: 15000, dayOfMonth: 5 }],
          },
        },
      } as any;

      const result = await node(state);

      expect(result.writeResult?.success).toBe(false);
      expect(result.writeResult?.error).toContain('cannot be empty');
      expect(result.pending_action).toBeNull();
    });

    it('calls writeTool.updateExpense for update_expense action and clears awaiting_clarification', async () => {
      mockWriteTool.updateExpense = jest.fn().mockResolvedValue({
        success: true,
        message: 'Successfully updated expense "water" (renamed to "Maynilad").',
      });

      const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
      const state = {
        context: { userId },
        pending_action: {
          tool: 'update_expense',
          intent: 'manage_expense',
          args: {
            targetName: 'water',
            newName: 'Maynilad',
          },
        },
      } as any;

      const result = await node(state);

      expect(mockWriteTool.updateExpense).toHaveBeenCalledWith(
        new Types.ObjectId(userId),
        expect.objectContaining({
          targetName: 'water',
          newName: 'Maynilad',
        }),
      );
      expect(result.writeResult?.success).toBe(true);
      expect(result.writeResult?.message).toContain('Successfully updated expense "water"');
      expect(result.pending_action).toBeNull();
      expect(result.awaiting_clarification).toBeNull();
    });

    it('does not coerce null amount or dayOfMonth to 0 when updating expense', async () => {
      mockWriteTool.updateExpense = jest.fn().mockResolvedValue({
        success: true,
        message: 'Successfully updated expense "water".',
      });

      const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
      const state = {
        context: { userId },
        pending_action: {
          tool: 'update_expense',
          intent: 'manage_expense',
          args: {
            targetName: 'water',
            newName: 'Maynilad',
            amount: null,
            dayOfMonth: null,
          },
        },
      } as any;

      await node(state);

      expect(mockWriteTool.updateExpense).toHaveBeenCalledWith(
        new Types.ObjectId(userId),
        expect.objectContaining({
          targetName: 'water',
          newName: 'Maynilad',
          amount: undefined,
          dayOfMonth: undefined,
        }),
      );
    });
  });

  describe('wishlist execution', () => {
    it('calls writeTool.createWishlist for create_wishlist action', async () => {
      mockWriteTool.createWishlist = jest.fn().mockResolvedValue({
        success: true,
        message: 'Successfully added wishlist item "Sony Headphones".',
      });

      const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
      const state = {
        context: { userId },
        pending_action: {
          tool: 'create_wishlist',
          intent: 'manage_wishlist',
          args: {
            items: [{ name: 'Sony Headphones', amount: 15000, priority: 'important' }],
          },
        },
      } as any;

      const result = await node(state);

      expect(mockWriteTool.createWishlist).toHaveBeenCalledWith(
        new Types.ObjectId(userId),
        expect.objectContaining({
          items: [{ name: 'Sony Headphones', amount: 15000, priority: 'important' }],
        }),
      );
      expect(result.writeResult?.success).toBe(true);
      expect(result.writeResult?.message).toContain('Successfully added wishlist item "Sony Headphones"');
      expect(result.pending_action).toBeNull();
    });

    it('returns error writeResult when createWishlist returns error', async () => {
      mockWriteTool.createWishlist = jest.fn().mockResolvedValue({
        error: 'Wishlist item name cannot be empty.',
      });

      const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
      const state = {
        context: { userId },
        pending_action: {
          tool: 'create_wishlist',
          intent: 'manage_wishlist',
          args: {
            items: [{ name: '', amount: 15000 }],
          },
        },
      } as any;

      const result = await node(state);

      expect(result.writeResult?.success).toBe(false);
      expect(result.writeResult?.error).toContain('cannot be empty');
      expect(result.pending_action).toBeNull();
    });

    it('calls writeTool.updateWishlist for update_wishlist action', async () => {
      mockWriteTool.updateWishlist = jest.fn().mockResolvedValue({
        success: true,
        message: 'Successfully updated wishlist item "Sony Headphones".',
      });

      const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
      const state = {
        context: { userId },
        pending_action: {
          tool: 'update_wishlist',
          intent: 'manage_wishlist',
          args: {
            targetName: 'Sony Headphones',
            newName: 'Sony WH-1000XM5',
          },
        },
      } as any;

      const result = await node(state);

      expect(mockWriteTool.updateWishlist).toHaveBeenCalledWith(
        new Types.ObjectId(userId),
        expect.objectContaining({
          targetName: 'Sony Headphones',
          newName: 'Sony WH-1000XM5',
        }),
      );
      expect(result.writeResult?.success).toBe(true);
      expect(result.pending_action).toBeNull();
    });

    it('calls writeTool.updateWishlist for purchase_wishlist action', async () => {
      mockWriteTool.updateWishlist = jest.fn().mockResolvedValue({
        success: true,
        message: 'Successfully marked wishlist item "Sony Headphones" as purchased.',
      });

      const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
      const state = {
        context: { userId },
        pending_action: {
          tool: 'purchase_wishlist',
          intent: 'manage_wishlist',
          args: {
            targetName: 'Sony Headphones',
            action: 'purchase',
          },
        },
      } as any;

      const result = await node(state);

      expect(mockWriteTool.updateWishlist).toHaveBeenCalledWith(
        new Types.ObjectId(userId),
        expect.objectContaining({
          targetName: 'Sony Headphones',
          action: 'purchase',
        }),
      );
      expect(result.writeResult?.success).toBe(true);
      expect(result.pending_action).toBeNull();
    });

    it('calls writeTool.updateWishlist for delete_wishlist action', async () => {
      mockWriteTool.updateWishlist = jest.fn().mockResolvedValue({
        success: true,
        message: 'Successfully removed "Sony Headphones" from your wishlist.',
      });

      const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
      const state = {
        context: { userId },
        pending_action: {
          tool: 'delete_wishlist',
          intent: 'manage_wishlist',
          args: {
            targetName: 'Sony Headphones',
            action: 'delete',
          },
        },
      } as any;

      const result = await node(state);

      expect(mockWriteTool.updateWishlist).toHaveBeenCalledWith(
        new Types.ObjectId(userId),
        expect.objectContaining({
          targetName: 'Sony Headphones',
          action: 'delete',
        }),
      );
      expect(result.writeResult?.success).toBe(true);
      expect(result.pending_action).toBeNull();
    });

    it('calls writeTool.swapWishlistPriority for swap_wishlist_priority action', async () => {
      mockWriteTool.swapWishlistPriority = jest.fn().mockResolvedValue({
        success: true,
        message: 'Successfully swapped priorities.',
      });

      const node = executeWriteNodeFactory({ writeTool: mockWriteTool, observability: mockObservability });
      const state = {
        context: { userId },
        pending_action: {
          tool: 'swap_wishlist_priority',
          intent: 'swap_wishlist_priority',
          args: {
            item1Name: 'Sony Headphones',
            item2Name: 'Nike Shoes',
          },
        },
      } as any;

      const result = await node(state);

      expect(mockWriteTool.swapWishlistPriority).toHaveBeenCalledWith(
        new Types.ObjectId(userId),
        expect.objectContaining({
          item1Name: 'Sony Headphones',
          item2Name: 'Nike Shoes',
        }),
      );
      expect(result.writeResult?.success).toBe(true);
      expect(result.pending_action).toBeNull();
    });
  });
});
