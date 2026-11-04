import { AgentStateType } from './agent.state';

export function routeAfterGuard(state: AgentStateType): string {
  // Routes based on whether the user is answering a clarification question
  if (state.awaiting_clarification) {
    return 'extract-slots';
  }
  return 'classify-intent';
}

export function routeAfterClassify(state: AgentStateType): string {
  const intent = state.intentResult;
  if (!intent || intent.group === 'unknown') {
    return 'clarify';
  }
  if (intent.group === 'non-domain') {
    return 'respond';
  }
  // Groups C (Read), D (Write), E (Analysis)
  return 'extract-slots';
}

export function routeAfterSlots(state: AgentStateType): string {
  // If slots are missing or incomplete, clarify; otherwise proceed to capability/policy check
  if (state.slots?.incomplete) {
    return 'clarify';
  }
  return 'capability-check';
}

export function routeAfterCapability(state: AgentStateType): string {
  const cap = state.intentResult?.capabilityCheck;
  if (cap?.blocked || cap?.invalid) {
    return 'blocked';
  }
  const group = state.intentResult?.group;
  if (group === 'read') {
    return 'read-data';
  }
  if (group === 'analysis') {
    return 'analyze';
  }
  if (group === 'write') {
    return 'prepare-action';
  }
  return 'respond';
}

export function routeAfterResolve(state: AgentStateType): string {
  const action = state.pending_action?.resolution;
  if (action === 'confirm') {
    return 'execute-write';
  }
  if (action === 'deny' || action === 'cancel') {
    return 'respond';
  }
  if (action === 'correction') {
    return 'extract-slots';
  }
  if (action === 'new_request') {
    return 'classify-intent';
  }
  return 'respond';
}

export function routeAfterExec(state: AgentStateType): string {
  if (state.pending_action?.conflict) {
    return 'prepare-action';
  }
  return 'respond';
}
