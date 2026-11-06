import { AgentStateType } from '../agent.state';
import { SlotExtractor } from '../../llm/slot-extractor';
import { HumanMessage } from '@langchain/core/messages';

export const extractSlotsNodeFactory = (slotExtractor?: SlotExtractor) => {
  return async function extractSlotsNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const lastUserMessage = [...state.messages].reverse().find((m) => HumanMessage.isInstance(m))?.content;
    const prevAssistantMessage = [...state.messages]
      .reverse()
      .find((m) => !HumanMessage.isInstance(m))?.content;

    const messageText = typeof lastUserMessage === 'string' ? lastUserMessage : '';
    const prevText = typeof prevAssistantMessage === 'string' ? prevAssistantMessage : undefined;

    if (!slotExtractor) {
      return { slots: { searchName: null, month: null, limit: null, accountName: null, standaloneQuery: messageText } };
    }

    const slots = await slotExtractor.extract(messageText, prevText);

    return {
      slots,
    };
  };
};

export const extractSlotsNode = extractSlotsNodeFactory();
