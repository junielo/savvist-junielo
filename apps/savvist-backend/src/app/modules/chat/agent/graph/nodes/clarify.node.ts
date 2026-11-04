import { AgentStateType } from '../agent.state';

export async function clarifyNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  // TODO: Formulate clarification question when slots or intent are missing/unknown.
  return {};
}
