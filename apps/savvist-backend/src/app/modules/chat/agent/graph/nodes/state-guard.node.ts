import { AgentStateType } from '../agent.state';

export async function stateGuardNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  // TODO: Check if waiting on a clarification answer or specific state constraints.
  return {};
}
