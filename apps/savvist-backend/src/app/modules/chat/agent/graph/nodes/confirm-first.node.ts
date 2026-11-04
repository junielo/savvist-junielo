import { AgentStateType } from '../agent.state';
import { interrupt } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';

export async function confirmFirstNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  // TODO: Trigger interrupt() for user confirmation of risky writes.
  const response = interrupt({ pending_action: state.pending_action });
  return { messages: [new HumanMessage(String(response))] };
}
