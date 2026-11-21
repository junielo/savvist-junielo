import { AIMessage } from '@langchain/core/messages';
import { Types } from 'mongoose';
import { AgentStateType } from '../agent.state';
import { ObservabilityService } from '../../observability/observability.service';
import { getRiskTier } from '../../intent/risk-tier';
import { normalizeDate, formatOrdinal } from '../../tools/date-utils';
import type { PendingAction, ConflictItem } from '../pending-action.schema';
import { WriteTool } from '../../tools/write.tool';

export interface PrepareActionDeps {
  observability?: ObservabilityService;
  writeTool?: WriteTool;
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
        awaiting_clarification: null,
        ...(state.queued_queries ? { queued_queries: state.queued_queries } : {}),
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
        awaiting_clarification: null,
        ...(state.queued_queries ? { queued_queries: state.queued_queries } : {}),
        messages: [new AIMessage(description)],
      };
    }

    if (intent === 'manage_expense') {
      if (slots?.updateExpense) {
        const update = slots.updateExpense;
        const userIdStr = state.context?.userId;
        let existingExpense: any = null;
        if (userIdStr && deps.writeTool) {
          try {
            existingExpense = await deps.writeTool.resolveExpense(
              new Types.ObjectId(userIdStr),
              update.targetName,
            );
          } catch {
            // resolve failed
          }
        }

        const resolvedName = existingExpense?.name ?? update.targetName;
        const currentAmt = existingExpense?.amount;
        const currentDay = existingExpense?.dayOfMonth;
        const currentMonths = existingExpense?.months;

        const currentDetails: string[] = [];
        if (currentAmt !== undefined && currentAmt !== null) {
          currentDetails.push(
            `₱${Number(currentAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          );
        }
        if (currentDay) {
          currentDetails.push(`due every ${formatOrdinal(currentDay)}`);
        }
        const currentInfo = currentDetails.length > 0 ? ` (${currentDetails.join(', ')})` : '';

        const changes: string[] = [];
        if (update.newName && update.newName !== resolvedName) {
          changes.push(`rename it to "${update.newName}"`);
        }
        if (update.amount !== null && update.amount !== undefined) {
          changes.push(
            `set amount to ₱${Number(update.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          );
        }
        if (update.dayOfMonth !== null && update.dayOfMonth !== undefined) {
          changes.push(`set due day to every ${formatOrdinal(update.dayOfMonth)}`);
        }
        if (update.months && update.months.length > 0) {
          const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          changes.push(`set months to ${update.months.map((m: number) => monthNames[m]).join(', ')}`);
        }

        const changeStr = changes.length > 0 ? changes.join(' and ') : 'update it';
        const description = `Would you like to update the expense "${resolvedName}"${currentInfo} to ${changeStr}? Reply "yes" to confirm or "no" to cancel.`;

        const pendingAction: PendingAction = {
          tool: 'update_expense',
          intent,
          risk,
          args: {
            id: existingExpense?._id ? String(existingExpense._id) : undefined,
            targetName: resolvedName,
            previousName: resolvedName,
            previousAmount: currentAmt,
            previousDayOfMonth: currentDay,
            previousMonths: currentMonths,
            newName: update.newName ?? undefined,
            amount: update.amount != null ? Number(update.amount) : currentAmt,
            dayOfMonth: update.dayOfMonth != null ? Number(update.dayOfMonth) : currentDay,
            months: update.months && update.months.length > 0 ? update.months : currentMonths,
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
          awaiting_clarification: null,
          ...(state.queued_queries ? { queued_queries: state.queued_queries } : {}),
          messages: [new AIMessage(description)],
        };
      }

      const expenses = (slots?.expenses as any[]) || [];
      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formatExpenseLine = (exp: any) => {
        const amt = `₱${Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const dayStr = exp.dayOfMonth ? `due every ${formatOrdinal(exp.dayOfMonth)}` : 'monthly';
        const monthsStr =
          exp.months && exp.months.length > 0
            ? ` in ${exp.months.map((m: number) => monthNames[m]).join(', ')}`
            : '';
        return `- ${exp.name}: ${amt} (${dayStr}${monthsStr})`;
      };

      let description: string;
      if (expenses.length === 1) {
        const exp = expenses[0];
        const amt = `₱${Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const dayStr = exp.dayOfMonth ? `every ${formatOrdinal(exp.dayOfMonth)}` : 'every month';
        const monthsStr =
          exp.months && exp.months.length > 0
            ? ` in ${exp.months.map((m: number) => monthNames[m]).join(', ')}`
            : '';
        description = `Would you like to add the expense "${exp.name}" for ${amt} (due ${dayStr}${monthsStr})? Reply "yes" to confirm or "no" to cancel.`;
      } else if (expenses.length > 1) {
        const lines = expenses.map(formatExpenseLine).join('\n');
        description = `Would you like to add the following expenses:\n${lines}\n\nReply "yes" to confirm or "no" to cancel.`;
      } else {
        description = `What expense would you like to add?`;
      }

      const pendingAction: PendingAction = {
        tool: 'create_expense',
        intent,
        risk,
        args: {
          expenses,
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
        awaiting_clarification: null,
        ...(state.queued_queries ? { queued_queries: state.queued_queries } : {}),
        messages: [new AIMessage(description)],
      };
    }

    if (intent === 'manage_wishlist') {
      if (slots?.updateWishlist) {
        const update = slots.updateWishlist;
        const userIdStr = state.context?.userId;
        let existingItem: any = null;
        if (userIdStr && deps.writeTool) {
          try {
            existingItem = await deps.writeTool.resolveWishlistItem(
              new Types.ObjectId(userIdStr),
              update.targetName,
            );
          } catch {
            // resolve failed
          }
        }

        const resolvedName = existingItem?.name ?? update.targetName;
        const currentAmt = existingItem?.amount;
        const currentPriority = existingItem?.priority;
        const formattedCurrentAmt =
          currentAmt !== undefined && currentAmt !== null
            ? `₱${Number(currentAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : null;

        // Delete action
        if (update.action === 'delete') {
          const info = formattedCurrentAmt ? ` (${formattedCurrentAmt})` : '';
          const description = `Would you like to remove the wishlist item "${resolvedName}"${info} from your wishlist? Reply "yes" to confirm or "no" to cancel.`;

          const pendingAction: PendingAction = {
            tool: 'delete_wishlist',
            intent,
            risk,
            args: {
              id: existingItem?._id ? String(existingItem._id) : undefined,
              targetName: resolvedName,
              action: 'delete',
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
            awaiting_clarification: null,
            ...(state.queued_queries ? { queued_queries: state.queued_queries } : {}),
            messages: [new AIMessage(description)],
          };
        }

        // Purchase action
        if (update.action === 'purchase' || update.status === 'purchased') {
          const info = formattedCurrentAmt ? ` (${formattedCurrentAmt})` : '';
          const description = `Would you like to mark the wishlist item "${resolvedName}"${info} as purchased? Reply "yes" to confirm or "no" to cancel.`;

          const pendingAction: PendingAction = {
            tool: 'purchase_wishlist',
            intent,
            risk,
            args: {
              id: existingItem?._id ? String(existingItem._id) : undefined,
              targetName: resolvedName,
              action: 'purchase',
              status: 'purchased',
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
            awaiting_clarification: null,
            ...(state.queued_queries ? { queued_queries: state.queued_queries } : {}),
            messages: [new AIMessage(description)],
          };
        }

        // Update action (rename, amount, priority)
        const currentDetails: string[] = [];
        if (formattedCurrentAmt) {
          currentDetails.push(formattedCurrentAmt);
        }
        if (currentPriority) {
          currentDetails.push(`${currentPriority} priority`);
        }
        const currentInfo = currentDetails.length > 0 ? ` (${currentDetails.join(', ')})` : '';

        const changes: string[] = [];
        if (update.newName && update.newName !== resolvedName) {
          changes.push(`rename it to "${update.newName}"`);
        }
        if (update.amount !== null && update.amount !== undefined) {
          changes.push(
            `set price to ₱${Number(update.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          );
        }
        if (update.priority && update.priority !== currentPriority) {
          changes.push(`set priority to "${update.priority}"`);
        }

        const changeStr = changes.length > 0 ? changes.join(' and ') : 'update it';
        const description = `Would you like to update the wishlist item "${resolvedName}"${currentInfo} to ${changeStr}? Reply "yes" to confirm or "no" to cancel.`;

        const pendingAction: PendingAction = {
          tool: 'update_wishlist',
          intent,
          risk,
          args: {
            id: existingItem?._id ? String(existingItem._id) : undefined,
            targetName: resolvedName,
            previousName: resolvedName,
            previousAmount: currentAmt,
            previousPriority: currentPriority,
            newName: update.newName ?? undefined,
            amount: update.amount != null ? Number(update.amount) : currentAmt,
            priority: update.priority ?? currentPriority,
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
          awaiting_clarification: null,
          ...(state.queued_queries ? { queued_queries: state.queued_queries } : {}),
          messages: [new AIMessage(description)],
        };
      }

      // Create wishlist items
      const items = (slots?.wishlistItems as any[]) || [];

      // Backfill description from previous product search results in state if available
      const searchItems = (state.readResult as any)?.items;
      if (Array.isArray(searchItems) && searchItems.length > 0) {
        for (const item of items) {
          if (!item.description) {
            const match = searchItems.find((p: any) =>
              p.name && (
                p.name.toLowerCase().includes(item.name.toLowerCase()) ||
                item.name.toLowerCase().includes(p.name.toLowerCase())
              ),
            );
            if (match?.description) {
              item.description = match.description;
            } else if (searchItems.length === 1 && searchItems[0]?.description) {
              item.description = searchItems[0].description;
            }
          }
        }
      }
      const formatWishlistLine = (item: any) => {
        const amt = `₱${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const prio = item.priority ? `${item.priority} priority` : 'normal priority';
        return `- ${item.name}: ${amt} (${prio})`;
      };

      let description: string;
      if (items.length === 1) {
        const item = items[0];
        const amt = `₱${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const prio = item.priority ? ` (${item.priority} priority)` : '';
        description = `Would you like to add "${item.name}" for ${amt}${prio} to your wishlist? Reply "yes" to confirm or "no" to cancel.`;
      } else if (items.length > 1) {
        const lines = items.map(formatWishlistLine).join('\n');
        description = `Would you like to add the following items to your wishlist:\n${lines}\n\nReply "yes" to confirm or "no" to cancel.`;
      } else {
        description = `What item would you like to add to your wishlist?`;
      }

      const pendingAction: PendingAction = {
        tool: 'create_wishlist',
        intent,
        risk,
        args: {
          items,
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
        awaiting_clarification: null,
        ...(state.queued_queries ? { queued_queries: state.queued_queries } : {}),
        messages: [new AIMessage(description)],
      };
    }

    if (intent === 'swap_wishlist_priority') {
      const item1 = slots?.swapWishlist?.item1Name ?? 'Item 1';
      const item2 = slots?.swapWishlist?.item2Name ?? 'Item 2';
      const description = `Would you like to swap priorities between "${item1}" and "${item2}" on your wishlist? Reply "yes" to confirm or "no" to cancel.`;

      const pendingAction: PendingAction = {
        tool: 'swap_wishlist_priority',
        intent,
        risk,
        args: {
          item1Name: item1,
          item2Name: item2,
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
        awaiting_clarification: null,
        ...(state.queued_queries ? { queued_queries: state.queued_queries } : {}),
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
      awaiting_clarification: null,
      ...(state.queued_queries ? { queued_queries: state.queued_queries } : {}),
      messages: [new AIMessage(description)],
    };
  };
}

export const prepareActionNode = prepareActionNodeFactory();
