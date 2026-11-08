import { AgentStateType } from '../agent.state';
import { SlotExtractor } from '../../llm/slot-extractor';
import { HumanMessage } from '@langchain/core/messages';
import { ObservabilityService } from '../../observability/observability.service';

export interface ExtractSlotsDeps {
  slotExtractor?: SlotExtractor;
  observability?: ObservabilityService;
}

export const extractSlotsNodeFactory = (deps: ExtractSlotsDeps | SlotExtractor = {}) => {
  const slotExtractor = deps instanceof SlotExtractor ? deps : deps.slotExtractor;
  const observability = deps instanceof SlotExtractor ? undefined : deps.observability;

  return async function extractSlotsNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    observability?.SetExecutedNode('extract-slots');
    const lastUserMessage = [...state.messages].reverse().find((m) => HumanMessage.isInstance(m))?.content;
    const prevAssistantMessage = [...state.messages]
      .reverse()
      .find((m) => !HumanMessage.isInstance(m))?.content;

    const messageText = typeof lastUserMessage === 'string' ? lastUserMessage : '';
    const prevText = typeof prevAssistantMessage === 'string' ? prevAssistantMessage : undefined;
    const intent = state.intentResult?.intent;

    if (!slotExtractor) {
      return { slots: { searchName: null, month: null, limit: null, accountName: null, standaloneQuery: messageText } };
    }

    const slots = await slotExtractor.extract(messageText, prevText, intent);

    return {
      slots,
    };
  };
};

export const extractSlotsNode = extractSlotsNodeFactory();
