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
        };
      }

      return {
        writeResult: {
          success: true,
          message: 'message' in result ? result.message : 'Salary / employment status updated successfully.',
          record: 'records' in result ? result.records : null,
        },
        pending_action: null,
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
      };
    }

    return {
      writeResult: {
        success: true,
        message: 'message' in result ? result.message : 'Balance updated successfully.',
        record: 'records' in result ? result.records : null,
      },
      pending_action: null,
    };
  };
}

export const executeWriteNode = executeWriteNodeFactory();
