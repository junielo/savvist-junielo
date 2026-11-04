import { AgentStateType } from '../agent.state';

export interface StateGuardOptions {
  maxClarificationTurns?: number; // default 2
}

export function stateGuardNode(opts: StateGuardOptions = {}) {
  const max = opts.maxClarificationTurns ?? 2;

  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    if (state.awaiting_clarification) {
      // Bounded loop: if we've already asked too many times, drop the
      // half-finished request and treat this message as brand new.
      if ((state.clarification_turns ?? 0) > max) {
        return {
          awaiting_clarification: null,
          clarification_turns: 0,
          intentResult: null,
          slots: null,
        };
      }
      // Normal case: the user is answering our question.
      // Keep intentResult and slots; routeAfterGuard sends this to extract-slots.
      return {};
    }

    // New request: wipe last turn's leftovers so they can't leak in.
    // pending_action is deliberately NOT touched: a paused confirmation
    // resumes at its interrupt and never passes through this node.
    return {
      intentResult: null,
      slots: null,
      clarification_turns: 0,
    };
  };
}