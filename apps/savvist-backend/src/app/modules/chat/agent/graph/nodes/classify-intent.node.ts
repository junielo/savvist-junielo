import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { AgentStateType } from '../agent.state';
import type { ClassifierInput, IntentResult } from '../../intent/intent.types';
import { applyStateGuards } from '../../intent/state-guards';
import { ObservabilityService } from '../../observability/observability.service';

export interface IntentClassifierPort {
  classify(input: ClassifierInput): Promise<IntentResult>;
}

export interface ClassifyIntentDeps {
  classifier: IntentClassifierPort;
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

/** Latest user message, plus the assistant message right before it (for follow-ups). */
function lastTurn(messages: BaseMessage[]): ClassifierInput | null {
  let userIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (HumanMessage.isInstance(messages[i])) {
      userIdx = i;
      break;
    }
  }
  if (userIdx === -1) return null;

  const message = textOf(messages[userIdx]);
  if (!message) return null;

  let previousAssistantMessage: string | undefined;
  for (let i = userIdx - 1; i >= 0; i--) {
    if (AIMessage.isInstance(messages[i])) {
      previousAssistantMessage = textOf(messages[i]);
      break;
    }
  }
  return { message, previousAssistantMessage };
}

export function classifyIntentNode(deps: ClassifyIntentDeps) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    deps.observability?.SetExecutedNode('classifyIntentNode');
    const input = lastTurn(state.messages);

    // Nothing to classify: send to clarify via 'unknown'
    if (!input) {
      return {
        intentResult: {
          intent: 'unknown',
          group: 'unknown',
          confidence: 0,
          runnerUp: null,
          probabilities: {},
          source: 'guard',
        },
      };
    }

    const raw = await deps.classifier.classify(input);

    // Code decides after Jev: thresholds already applied in scoreToResult,
    // state guards applied here.
    const intentResult = applyStateGuards(raw, state);

    return { intentResult };
  };
}