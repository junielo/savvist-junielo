import { AgentStateType } from '../agent.state';

export async function prepareActionNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  // TODO: Build pending action, derive risk from code, and set expiry without model I/O.
  return {};
}
