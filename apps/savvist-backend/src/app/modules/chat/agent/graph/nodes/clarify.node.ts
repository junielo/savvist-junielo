import { AgentStateType } from '../agent.state';
import { ObservabilityService } from '../../observability/observability.service';
import { formatOrdinal } from '../../tools/date-utils';

export interface ClarifyNodeDeps {
  observability?: ObservabilityService;
}

export const clarifyNodeFactory = (deps: ClarifyNodeDeps = {}) => {
  return async function clarifyNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    deps.observability?.SetExecutedNode('clarify');

    const ir = state.intentResult;
    const runnerUp = ir?.runnerUp;

    // Check for ambiguity between read_balances and manage_entry_record
    if (
      (ir?.intent === 'read_balances' && runnerUp?.intent === 'manage_entry_record') ||
      (ir?.intent === 'manage_entry_record' && runnerUp?.intent === 'read_balances') ||
      (ir?.probabilities?.read_balances &&
        ir?.probabilities?.manage_entry_record &&
        Math.abs(ir.probabilities.read_balances - ir.probabilities.manage_entry_record) < 0.35)
    ) {
      return {
        awaiting_clarification:
          'Did you want to check if your account balances have been entered for today, or would you like to record new account balances?',
      };
    }

    if (state.slots?.incomplete) {
      if (ir?.intent === 'manage_entry_record') {
        return {
          awaiting_clarification:
            'Which account and balance would you like to record? (For example: BDO 45,000, GCredit 11,000)',
        };
      }
      if (ir?.intent === 'update_base_salary') {
        return {
          awaiting_clarification:
            'What is your new base salary amount, or would you like to set your status to unemployed?',
        };
      }
      if (ir?.intent === 'manage_expense') {
        const update = state.slots?.updateExpense;
        if (update) {
          if (!update.targetName) {
            return {
              awaiting_clarification: 'Which expense would you like to update, and what would you like to change?',
            };
          }
          return {
            awaiting_clarification: `What would you like to update for "${update.targetName}"? You can change its name, amount, or recurring due day.`,
          };
        }

        const expenses = state.slots?.expenses;
        if (!expenses || expenses.length === 0) {
          return {
            awaiting_clarification:
              'You can list one or several expenses with their name, amount, and monthly due day.\n\nFor example:\nRent 15000 on the 5th, PLDT 1899 on the 20th\n\nWhat expense(s) would you like to add?',
          };
        }

        const missingDays = expenses.filter((e: any) => !e.dayOfMonth || e.dayOfMonth < 1 || e.dayOfMonth > 31);
        if (missingDays.length > 0) {
          const list = expenses
            .map((e: any) => {
              const amt = `₱${Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              return e.dayOfMonth
                ? `- ${e.name}: ${amt} (due every ${formatOrdinal(e.dayOfMonth)})`
                : `- ${e.name}: ${amt} — What day of the month is this due?`;
            })
            .join('\n');
          return {
            awaiting_clarification:
              `I have the following expense details, but I just need the monthly due day(s):\n${list}\n\nWhat day of the month is each due? (e.g. 5th, 20th)`,
          };
        }
      }
      if (ir?.intent === 'manage_wishlist') {
        const update = state.slots?.updateWishlist;
        if (update) {
          if (!update.targetName) {
            return {
              awaiting_clarification:
                'Which wishlist item would you like to update or remove?',
            };
          }
          return {
            awaiting_clarification: `What would you like to update for "${update.targetName}"? You can change its name, amount, priority, mark it as purchased, or remove it.`,
          };
        }

        const items = state.slots?.wishlistItems;
        if (!items || items.length === 0) {
          return {
            awaiting_clarification:
              'You can list one or several wishlist items with their name and estimated cost (and optional priority: asap, priority, important, normal, peripheral).\n\nFor example:\nSony Headphones 15000 (priority), Nike Shoes 4500\n\nWhat wishlist item(s) would you like to add?',
          };
        }

        const missingAmount = items.find((item: any) => !item.amount || item.amount <= 0);
        if (missingAmount) {
          return {
            awaiting_clarification: `What is the estimated cost or price for "${missingAmount.name}"?`,
          };
        }
      }
      if (ir?.intent === 'swap_wishlist_priority') {
        return {
          awaiting_clarification:
            'Which two wishlist items would you like to swap priorities between?',
        };
      }
      return {
        awaiting_clarification:
          'Could you provide more details so I can find what you are looking for?',
      };
    }

    return {
      awaiting_clarification:
        "I'm not quite sure I caught that. Could you tell me what you'd like to do with your balances, expenses, wishlist, or reminders?",
    };
  };
};

export const clarifyNode = clarifyNodeFactory();
