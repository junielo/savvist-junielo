import { AgentStateType } from '../agent.state';
import { ObservabilityService } from '../../observability/observability.service';

export interface ClarifyNodeDeps {
  observability?: ObservabilityService;
}

export const clarifyNodeFactory = (deps: ClarifyNodeDeps = {}) => {
  return async function clarifyNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    deps.observability?.SetExecutedNode('clarify');

    const ir = state.intentResult;
    const runnerUp = ir?.runnerUp;

    // Check for ambiguity between read_balances and manage_entry_record
    if (
      (ir?.intent === 'read_balances' && runnerUp?.intent === 'manage_entry_record') ||
      (ir?.intent === 'manage_entry_record' && runnerUp?.intent === 'read_balances') ||
      (ir?.probabilities?.read_balances &&
        ir?.probabilities?.manage_entry_record &&
        Math.abs(ir.probabilities.read_balances - ir.probabilities.manage_entry_record) < 0.35)
    ) {
      return {
        awaiting_clarification:
          'Did you want to check if your account balances have been entered for today, or would you like to record new account balances?',
      };
    }

    if (state.slots?.incomplete) {
      return {
        awaiting_clarification:
          'Could you provide more details so I can find what you are looking for?',
      };
    }

    return {
      awaiting_clarification:
        "I'm not quite sure I caught that. Could you tell me what you'd like to do with your balances, expenses, wishlist, or reminders?",
    };
  };
};

export const clarifyNode = clarifyNodeFactory();
