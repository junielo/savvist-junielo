import { AgentStateType } from '../agent.state';

export async function resolveConfirmationNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  // TODO: Validate pending action schema and resolve user confirmation response (confirm, deny, cancel, correction, new request).
  return {};
}
