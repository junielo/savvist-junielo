import type { AgentStateType } from '../graph/agent.state';
import type { IntentResult } from './intent.types';

export function applyStateGuards(result: IntentResult, _state: AgentStateType): IntentResult {
  // Later, e.g.:
  // if (result.intent === 'confirm' && !_state.pending_action) {
  //   return { ...result, intent: 'unknown', group: 'unknown', source: 'guard' };
  // }
  return result;
}