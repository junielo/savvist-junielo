/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AgentStateType } from '../graph/agent.state';
import type { IntentResult } from './intent.types';

/**
 * State guards enforce graph-state invariants (e.g., ensuring state preconditions).
 * Semantic judgments (e.g., domain classification, policy boundaries) are handled by Jev.
 */
export function applyStateGuards(
  result: IntentResult,
  _state: AgentStateType,
  _userMessage?: string,
): IntentResult {
  return result;
}
