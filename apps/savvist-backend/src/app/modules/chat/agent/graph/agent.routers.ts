import { AIMessage } from '@langchain/core/messages';
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
  // Open-ended data questions go to the tool loop. The model chooses the tools and
  // arguments, so slot extraction and the capability check are skipped. Policy rules
  // must be enforced inside the tools instead.
  // ASSUMPTION: the intent name field is `intent`; adjust to your intentResult shape.
  if ((intent as { intent?: string }).intent === 'data_question') {
    return 'tool-loop-init';
  }
  if (intent.isFollowUp) {
    return 'rewrite-query';
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

/**
 * After the model's turn in the tool loop: run the requested tools, or finish.
 * The step cap lives in tool-agent: at the cap the model is called without tools,
 * so it can only produce a text answer and this router sends it to respond.
 */
export function routeAfterToolAgent(state: AgentStateType): string {
  const last = state.toolMessages.at(-1);
  if (last && last instanceof AIMessage && last.tool_calls?.length) {
    return 'tool-loop-tools';
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