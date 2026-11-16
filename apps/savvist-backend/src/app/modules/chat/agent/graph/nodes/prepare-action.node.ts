import { AIMessage } from '@langchain/core/messages';
import { AgentStateType } from '../agent.state';
import { ObservabilityService } from '../../observability/observability.service';
import { getRiskTier } from '../../intent/risk-tier';
import { normalizeDate } from '../../tools/date-utils';
import type { PendingAction, ConflictItem } from '../pending-action.schema';

export interface PrepareActionDeps {
  observability?: ObservabilityService;
  expiryMs?: number; // default 10 minutes (600,000ms)
}

export function prepareActionNodeFactory(deps: PrepareActionDeps = {}) {
  const expiryMs = deps.expiryMs ?? 10 * 60 * 1000;

  return async function prepareActionNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    deps.observability?.SetExecutedNode('prepare-action');

    const intent = state.intentResult?.intent ?? 'manage_entry_record';
    const risk = getRiskTier(intent);
    const existingPending = state.pending_action as PendingAction | null;

    // Handle 409 conflict loop: user previously confirmed an action, but existing balance(s) were found
    if (existingPending?.conflict) {
      const conflictList: ConflictItem[] = Array.isArray(existingPending.conflict)
        ? existingPending.conflict
        : [existingPending.conflict];

      let description: string;
      if (conflictList.length === 1) {
        const c = conflictList[0];
        const formattedExisting = `₱${c.existingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formattedProposed = `₱${c.proposedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        description = `An existing balance of ${formattedExisting} is already recorded for ${c.accountName} on ${c.day}. Do you want to replace it with ${formattedProposed}? Reply "yes" to confirm or "no" to cancel.`;
      } else {
        const lines = conflictList
          .map(
            (c) =>
              `- ${c.accountName}: currently ₱${c.existingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (proposed: ₱${c.proposedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
          )
          .join('\n');
        description = `The following existing balances are already recorded on ${conflictList[0].day}:\n${lines}\nDo you want to overwrite them with the new amounts? Reply "yes" to confirm or "no" to cancel.`;
      }

      const updatedPending: PendingAction = {
        ...existingPending,
        description,
        confirmedReplace: true,
        conflict: null,
        resolution: null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiryMs).toISOString(),
      };

      return {
        pending_action: updatedPending,
        messages: [new AIMessage(description)],
      };
    }

    // Fresh action preparation
    const slots = state.slots;

    if (intent === 'update_base_salary') {
      let description: string;
      let args: Record<string, unknown>;

      if (slots?.isUnemployed === true) {
        description = `Would you like to update your employment status to unemployed (this will set your base salary to ₱0.00)? Reply "yes" to confirm or "no" to cancel.`;
        args = { isUnemployed: true, baseSalary: 0 };
      } else if (slots?.baseSalary !== null && slots?.baseSalary !== undefined) {
        const formatted = `₱${Number(slots.baseSalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (slots?.isUnemployed === false) {
          description = `Would you like to update your status to employed and set your base salary to ${formatted}? Reply "yes" to confirm or "no" to cancel.`;
          args = { isUnemployed: false, baseSalary: Number(slots.baseSalary) };
        } else {
          description = `Would you like to update your base salary to ${formatted}? Reply "yes" to confirm or "no" to cancel.`;
          args = { baseSalary: Number(slots.baseSalary) };
        }
      } else {
        description = `What is your new base salary amount or employment status?`;
        args = {};
      }

      const pendingAction: PendingAction = {
        tool: 'update_salary',
        intent,
        risk,
        args,
        description,
        confirmedReplace: false,
        conflict: null,
        resolution: null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiryMs).toISOString(),
      };

      return {
        pending_action: pendingAction,
        messages: [new AIMessage(description)],
      };
    }

    const today = state.context?.today ?? new Date().toISOString().slice(0, 10);
    let targetDay = today;

    if (slots?.date) {
      const normalized = normalizeDate(slots.date, today);
      if (normalized.ok) {
        targetDay = normalized.date;
      }
    }

    let entries: { accountName: string; amount: number }[] = [];
    if (slots?.entries && Array.isArray(slots.entries) && slots.entries.length > 0) {
      entries = slots.entries.map((e: any) => ({
        accountName: String(e.accountName),
        amount: Number(e.amount),
      }));
    } else if (slots?.accountName && slots?.amount !== null && slots?.amount !== undefined) {
      entries = [{ accountName: String(slots.accountName), amount: Number(slots.amount) }];
    }

    let description: string;
    if (entries.length === 1) {
      const formattedAmount = `₱${entries[0].amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      description = `Would you like to record a balance of ${formattedAmount} for ${entries[0].accountName} on ${targetDay}? Reply "yes" to confirm or "no" to cancel.`;
    } else if (entries.length > 1) {
      const lines = entries
        .map(
          (e) =>
            `- ${e.accountName}: ₱${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        )
        .join('\n');
      description = `Would you like to record the following balances for ${targetDay}:\n${lines}\nReply "yes" to confirm or "no" to cancel.`;
    } else {
      // Incomplete parameters fallback
      description = `Which account and balance would you like to record for ${targetDay}?`;
    }

    const pendingAction: PendingAction = {
      tool: 'update_balance',
      intent,
      risk,
      args: {
        entries,
        accountName: entries[0]?.accountName ?? 'your account',
        amount: entries[0]?.amount ?? 0,
        date: targetDay,
      },
      description,
      confirmedReplace: false,
      conflict: null,
      resolution: null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiryMs).toISOString(),
    };

    return {
      pending_action: pendingAction,
      messages: [new AIMessage(description)],
    };
  };
}

export const prepareActionNode = prepareActionNodeFactory();
