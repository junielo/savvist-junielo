import { AgentStateType } from '../agent.state';
import { SlotExtractor, HistoryMessage } from '../../llm/slot-extractor';
import { HumanMessage } from '@langchain/core/messages';
import { ObservabilityService } from '../../observability/observability.service';

export interface ExtractSlotsDeps {
  slotExtractor?: SlotExtractor;
  observability?: ObservabilityService;
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((c: any) => (typeof c === 'string' ? c : c?.text ?? '')).join(' ');
  }
  return String(content ?? '');
}

export const extractSlotsNodeFactory = (deps: ExtractSlotsDeps | SlotExtractor = {}) => {
  const slotExtractor = deps instanceof SlotExtractor ? deps : deps.slotExtractor;
  const observability = deps instanceof SlotExtractor ? undefined : deps.observability;

  return async function extractSlotsNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    observability?.SetExecutedNode('extract-slots');
    const all = state.messages;
    const lastUserIndex = all.map((m) => HumanMessage.isInstance(m)).lastIndexOf(true);
    const lastUserMessage = lastUserIndex >= 0 ? textOf(all[lastUserIndex].content) : '';

    // Take up to 6 prior messages (3 full turns) before the current user message
    const historySlice = lastUserIndex >= 0 ? all.slice(0, lastUserIndex) : all.slice(0, -1);
    const recentHistory: HistoryMessage[] = historySlice
      .slice(-6)
      .map((m) => ({
        role: HumanMessage.isInstance(m) ? ('user' as const) : ('assistant' as const),
        text: textOf(m.content),
      }))
      .filter((h) => h.text.trim().length > 0);

    const intent = state.intentResult?.intent;

    if (!slotExtractor) {
      return { slots: { searchName: null, month: null, limit: null, accountName: null, standaloneQuery: lastUserMessage } };
    }

    const slots = await slotExtractor.extract(lastUserMessage, recentHistory, intent);

    return {
      slots,
    };
  };
};

export const extractSlotsNode = extractSlotsNodeFactory();
