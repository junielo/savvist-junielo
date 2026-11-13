import { AgentStateType } from '../agent.state';
import { ObservabilityService } from '../../observability/observability.service';

export interface BlockedNodeDeps {
  observability?: ObservabilityService;
}

export const blockedNodeFactory = (deps: BlockedNodeDeps = {}) => {
  return async function blockedNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    deps.observability?.SetExecutedNode('blocked');
    const cap = state.intentResult?.capabilityCheck;
    if (!cap?.reason) {
      return {
        intentResult: {
          ...state.intentResult,
          capabilityCheck: {
            ...cap,
            blocked: true,
            reason: "I can't help with that request. I can help with balances, expenses, wishlist items, and reminders.",
          },
        },
      };
    }
    return {};
  };
};

export const blockedNode = blockedNodeFactory();
