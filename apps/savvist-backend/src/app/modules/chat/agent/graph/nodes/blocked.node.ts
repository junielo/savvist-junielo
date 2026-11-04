import { AgentStateType } from '../agent.state';

export async function blockedNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  // TODO: Explain refusal briefly and state alternative actions when capability check fails.
  return {};
}
