import { AgentStateType } from '../agent.state';
import { interrupt } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { ObservabilityService } from '../../observability/observability.service';

export interface ConfirmFirstDeps {
  observability?: ObservabilityService;
}

export function confirmFirstNodeFactory(deps: ConfirmFirstDeps = {}) {
  return async function confirmFirstNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    deps.observability?.SetExecutedNode('confirm-first');
    const response = interrupt({ pending_action: state.pending_action });
    return { messages: [new HumanMessage(String(response))] };
  };
}

export const confirmFirstNode = confirmFirstNodeFactory();
