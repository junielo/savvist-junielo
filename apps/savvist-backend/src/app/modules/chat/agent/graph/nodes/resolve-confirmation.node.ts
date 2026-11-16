import { HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { AgentStateType } from '../agent.state';
import { ObservabilityService } from '../../observability/observability.service';
import { PendingActionSchema, type PendingAction } from '../pending-action.schema';

export interface ResolveConfirmationDeps {
  observability?: ObservabilityService;
}

function textOf(msg: BaseMessage): string {
  const c = msg.content;
  if (typeof c === 'string') return c;
  return c
    .map((part) => (typeof part === 'string' ? part : 'text' in part ? String(part.text) : ''))
    .join(' ')
    .trim();
}

function lastHumanText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (HumanMessage.isInstance(messages[i])) {
      return textOf(messages[i]);
    }
  }
  return '';
}

export function resolveConfirmationNodeFactory(deps: ResolveConfirmationDeps = {}) {
  return async function resolveConfirmationNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    deps.observability?.SetExecutedNode('resolve-confirmation');

    const pending = state.pending_action;
    const parsed = PendingActionSchema.safeParse(pending);

    // If malformed pending_action, cancel it
    if (!parsed.success) {
      return {
        pending_action: {
          ...pending,
          resolution: 'cancel',
        },
      };
    }

    const action = parsed.data;

    // Check expiry
    const now = new Date().toISOString();
    if (action.expiresAt < now) {
      return {
        pending_action: {
          ...action,
          resolution: 'cancel',
        },
      };
    }

    const userText = lastHumanText(state.messages).toLowerCase().trim();

    // Check affirmation
    const affirmativeRegex = /^(yes|yep|yeah|sure|confirm|proceed|ok|okay|do it|go ahead|correct|approved|agree)\b/i;
    if (affirmativeRegex.test(userText)) {
      return {
        pending_action: {
          ...action,
          resolution: 'confirm',
        },
      };
    }

    // Check denial / cancellation
    const denialRegex = /^(no|nope|cancel|stop|don't|dont|nevermind|deny|disagree|reject)\b/i;
    if (denialRegex.test(userText)) {
      return {
        pending_action: {
          ...action,
          resolution: 'deny',
        },
      };
    }

    // Check correction (e.g. "make it 40000", "change to 50000", "no wait 30k")
    const correctionRegex = /\b(change|make it|correction|actually|instead|update to)\b|\d+/i;
    if (correctionRegex.test(userText)) {
      return {
        pending_action: {
          ...action,
          resolution: 'correction',
        },
      };
    }

    // If unrelated request
    return {
      pending_action: {
        ...action,
        resolution: 'new_request',
      },
    };
  };
}

export const resolveConfirmationNode = resolveConfirmationNodeFactory();
