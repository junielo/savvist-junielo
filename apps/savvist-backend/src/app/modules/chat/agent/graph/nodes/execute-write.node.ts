import { Types } from 'mongoose';
import { AgentStateType } from '../agent.state';
import { ObservabilityService } from '../../observability/observability.service';
import { WriteTool } from '../../tools/write.tool';
import type { PendingAction } from '../pending-action.schema';

export interface ExecuteWriteDeps {
  writeTool?: WriteTool;
  observability?: ObservabilityService;
}

export function executeWriteNodeFactory(deps: ExecuteWriteDeps = {}) {
  return async function executeWriteNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    deps.observability?.SetExecutedNode('execute-write');

    const userIdStr = state.context?.userId;
    if (!userIdStr) {
      throw new Error('User ID missing in state context');
    }
    const userId = new Types.ObjectId(userIdStr);

    const pending = state.pending_action as PendingAction | null;
    if (!pending || !pending.args) {
      return {
        writeResult: { success: false, error: 'No valid action to execute.' },
        pending_action: null,
      };
    }

    if (!deps.writeTool) {
      return {
        writeResult: { success: false, error: 'WriteTool is not available.' },
        pending_action: null,
      };
    }

    if (pending.tool === 'update_salary' || pending.intent === 'update_base_salary') {
      const args = pending.args as {
        baseSalary?: number;
        isUnemployed?: boolean;
      };

      const result = await deps.writeTool.updateSalary(userId, {
        baseSalary: args.baseSalary !== undefined ? Number(args.baseSalary) : undefined,
        isUnemployed: args.isUnemployed,
      });

      if ('error' in result && result.error) {
        return {
          writeResult: { success: false, error: result.error },
          pending_action: null,
          awaiting_clarification: null,
        };
      }

      return {
        writeResult: {
          success: true,
          message: 'message' in result ? result.message : 'Salary / employment status updated successfully.',
          record: 'records' in result ? result.records : null,
        },
        pending_action: null,
        awaiting_clarification: null,
      };
    }

    if (pending.tool === 'update_expense' || (pending.intent === 'manage_expense' && pending.args['targetName'])) {
      const args = pending.args as {
        id?: string;
        targetName: string;
        previousName?: string;
        previousAmount?: number;
        previousDayOfMonth?: number;
        previousMonths?: number[];
        newName?: string;
        amount?: number;
        dayOfMonth?: number;
        months?: number[];
      };

      const result = await deps.writeTool.updateExpense(userId, {
        id: args.id,
        targetName: args.targetName,
        previousName: args.previousName,
        previousAmount: args.previousAmount,
        previousDayOfMonth: args.previousDayOfMonth,
        previousMonths: args.previousMonths,
        newName: args.newName,
        amount: args.amount != null ? Number(args.amount) : undefined,
        dayOfMonth: args.dayOfMonth != null ? Number(args.dayOfMonth) : undefined,
        months: args.months && args.months.length > 0 ? args.months : undefined,
      });

      if ('error' in result && result.error) {
        return {
          writeResult: { success: false, error: result.error },
          pending_action: null,
          awaiting_clarification: null,
        };
      }

      return {
        writeResult: {
          success: true,
          message: 'message' in result ? result.message : 'Expense updated successfully.',
          record: 'records' in result ? result.records : null,
        },
        pending_action: null,
        awaiting_clarification: null,
      };
    }

    if (pending.tool === 'create_expense' || pending.intent === 'manage_expense') {
      const args = pending.args as {
        expenses?: any[];
        name?: string;
        amount?: number;
        dayOfMonth?: number;
        months?: number[];
      };

      const result = await deps.writeTool.createExpense(userId, {
        expenses: args.expenses,
        name: args.name,
        amount: args.amount !== undefined ? Number(args.amount) : undefined,
        dayOfMonth: args.dayOfMonth !== undefined ? Number(args.dayOfMonth) : undefined,
        months: args.months,
      });

      if ('error' in result && result.error) {
        return {
          writeResult: { success: false, error: result.error },
          pending_action: null,
          awaiting_clarification: null,
        };
      }

      return {
        writeResult: {
          success: true,
          message: 'message' in result ? result.message : 'Expense(s) created successfully.',
          record: 'records' in result ? result.records : null,
        },
        pending_action: null,
        awaiting_clarification: null,
      };
    }

    if (
      pending.tool === 'create_wishlist' ||
      (pending.intent === 'manage_wishlist' && (pending.args['items'] || pending.args['wishlistItems']))
    ) {
      const args = pending.args as {
        items?: any[];
        wishlistItems?: any[];
        name?: string;
        amount?: number;
        priority?: string;
      };

      const result = await deps.writeTool.createWishlist(userId, {
        items: args.items ?? args.wishlistItems,
        name: args.name,
        amount: args.amount !== undefined ? Number(args.amount) : undefined,
        priority: args.priority,
      });

      if ('error' in result && result.error) {
        return {
          writeResult: { success: false, error: result.error },
          pending_action: null,
          awaiting_clarification: null,
        };
      }

      return {
        writeResult: {
          success: true,
          message: 'message' in result ? result.message : 'Wishlist item(s) created successfully.',
          record: 'records' in result ? result.records : null,
        },
        pending_action: null,
        awaiting_clarification: null,
      };
    }

    if (
      pending.tool === 'update_wishlist' ||
      pending.tool === 'purchase_wishlist' ||
      pending.tool === 'delete_wishlist' ||
      (pending.intent === 'manage_wishlist' && pending.args['targetName'])
    ) {
      const args = pending.args as {
        id?: string;
        targetName: string;
        previousName?: string;
        previousAmount?: number;
        previousPriority?: string;
        newName?: string;
        amount?: number;
        priority?: string;
        status?: 'pending' | 'purchased';
        action?: 'update' | 'purchase' | 'delete';
      };

      const result = await deps.writeTool.updateWishlist(userId, {
        id: args.id,
        targetName: args.targetName,
        previousName: args.previousName,
        previousAmount: args.previousAmount,
        previousPriority: args.previousPriority,
        newName: args.newName,
        amount: args.amount != null ? Number(args.amount) : undefined,
        priority: args.priority,
        status: args.status,
        action: args.action,
      });

      if ('error' in result && result.error) {
        return {
          writeResult: { success: false, error: result.error },
          pending_action: null,
          awaiting_clarification: null,
        };
      }

      return {
        writeResult: {
          success: true,
          message: 'message' in result ? result.message : 'Wishlist item updated successfully.',
          record: 'records' in result ? result.records : null,
        },
        pending_action: null,
        awaiting_clarification: null,
      };
    }

    if (pending.tool === 'swap_wishlist_priority' || pending.intent === 'swap_wishlist_priority') {
      const args = pending.args as {
        item1Name: string;
        item2Name: string;
      };

      const result = await deps.writeTool.swapWishlistPriority(userId, {
        item1Name: args.item1Name,
        item2Name: args.item2Name,
      });

      if ('error' in result && result.error) {
        return {
          writeResult: { success: false, error: result.error },
          pending_action: null,
          awaiting_clarification: null,
        };
      }

      return {
        writeResult: {
          success: true,
          message: 'message' in result ? result.message : 'Wishlist priorities swapped successfully.',
          record: 'records' in result ? result.records : null,
        },
        pending_action: null,
        awaiting_clarification: null,
      };
    }

    const args = pending.args as {
      accountName?: string;
      amount?: number;
      entries?: { accountName: string; amount: number }[];
      date?: string;
    };

    const result = await deps.writeTool.updateBalance(userId, {
      accountName: args.accountName,
      amount: args.amount !== undefined ? Number(args.amount) : undefined,
      entries: args.entries,
      date: args.date,
      confirmedReplace: pending.confirmedReplace ?? false,
    });

    // Check if a 409 conflict was detected
    if ('conflict' in result && result.conflict) {
      return {
        pending_action: {
          ...pending,
          conflict: result.conflicts ?? {
            existingBalance: result.existingBalance,
            proposedBalance: result.proposedBalance,
            accountName: result.accountName,
            day: result.day,
          },
        },
      };
    }

    if ('error' in result && result.error) {
      return {
        writeResult: { success: false, error: result.error },
        pending_action: null,
        awaiting_clarification: null,
      };
    }

    return {
      writeResult: {
        success: true,
        message: 'message' in result ? result.message : 'Balance updated successfully.',
        record: 'records' in result ? result.records : null,
      },
      pending_action: null,
      awaiting_clarification: null,
    };
  };
}

export const executeWriteNode = executeWriteNodeFactory();
