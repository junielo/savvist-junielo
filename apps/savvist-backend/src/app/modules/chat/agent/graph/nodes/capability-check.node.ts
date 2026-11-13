/* eslint-disable @typescript-eslint/no-explicit-any */
import { AgentStateType } from '../agent.state';
import { CapabilityCheckService } from '../../capabilities/capability-check.service';
import { ObservabilityService } from '../../observability/observability.service';
import { HumanMessage } from '@langchain/core/messages';

export interface CapabilityCheckNodeDeps {
  capabilityService?: CapabilityCheckService;
  observability?: ObservabilityService;
}

function textOfMessage(msg: any): string {
  if (!msg) return '';
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.map((p: any) => (typeof p === 'string' ? p : p.text ?? '')).join(' ');
  }
  return String(msg.content ?? '');
}

export const capabilityCheckNodeFactory = (deps: CapabilityCheckNodeDeps = {}) => {
  return async function capabilityCheckNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    deps.observability?.SetExecutedNode('capability-check');

    const intentResult = state.intentResult;
    if (!intentResult) {
      return {};
    }

    if (!deps.capabilityService) {
      return {};
    }

    // Find the latest user message
    let lastUserMessage = '';
    for (let i = state.messages.length - 1; i >= 0; i--) {
      if (HumanMessage.isInstance(state.messages[i])) {
        lastUserMessage = textOfMessage(state.messages[i]);
        break;
      }
    }

    const checkOutcome = await deps.capabilityService.check({
      intent: intentResult.intent,
      group: intentResult.group,
      message: lastUserMessage,
      today: state.context?.today ?? '',
      timeZone: state.context?.timeZone ?? 'UTC',
      slots: state.slots,
    });

    return {
      intentResult: {
        ...intentResult,
        capabilityCheck: checkOutcome,
      },
    };
  };
};

export const capabilityCheckNode = capabilityCheckNodeFactory();
