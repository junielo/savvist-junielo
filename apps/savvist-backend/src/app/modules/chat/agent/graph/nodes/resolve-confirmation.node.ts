import { HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { AgentStateType } from '../agent.state';
import { ObservabilityService } from '../../observability/observability.service';
import { PendingActionSchema, type PendingAction } from '../pending-action.schema';
import { JevClient } from '../../intent/classifiers/jev.client';

export interface ResolveConfirmationDeps {
  observability?: ObservabilityService;
  jevClient?: JevClient;
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

    const userText = lastHumanText(state.messages).trim();

    let resolution: 'confirm' | 'deny' | 'correction' | 'new_request' | null = null;

    if (deps.jevClient) {
      try {
        const jevRes = await deps.jevClient.resolveConfirmationResponse(userText, action.description);
        resolution = jevRes.resolution;
      } catch {
        // Fall back to lightweight code heuristics if Jev throws
      }
    }

    const lower = userText.toLowerCase();
    const affirmativeRegex = /^(yes|yep|yeah|sure|confirm|proceed|ok|okay|do it|go ahead|correct|approved|agree)\b/i;
    const denialRegex = /^(no|nope|cancel|stop|don't|dont|nevermind|deny|disagree|reject)\b/i;

    if (resolution === 'new_request') {
      if (affirmativeRegex.test(lower)) {
        resolution = 'confirm';
      } else if (denialRegex.test(lower)) {
        resolution = 'deny';
      }
    } else if (!resolution) {
      if (affirmativeRegex.test(lower)) {
        resolution = 'confirm';
      } else if (denialRegex.test(lower)) {
        resolution = 'deny';
      } else if (/\b(change|make it|correction|actually|instead|update to)\b|\d+/i.test(lower)) {
        resolution = 'correction';
      } else {
        resolution = 'new_request';
      }
    }

    return {
      pending_action: {
        ...action,
        resolution,
      },
    };
  };
}

export const resolveConfirmationNode = resolveConfirmationNodeFactory();
