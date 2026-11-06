import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { AgentStateType } from '../agent.state';
import { ASSISTANT_PROFILE as P } from '../../intent/assistant-profile';
import { ReplyWriter } from '../../llm/reply-writer';

const ASK_REPHRASE =
  "I'm not quite sure I caught that. Could you tell me what you'd like to do with your balances, expenses, wishlist, or reminders?";

function smalltalk(intent: string): string {
  switch (intent) {
    case 'greeting':
      return `Hi! I'm ${P.name}. How can I help with your finances today?`;
    case 'about-assistant':
      return `I'm ${P.name}, your daily personal finance assistant.`;
    case 'capabilities':
      return `I can help you with: ${P.capabilities.join('; ')}.`;
    case 'purpose':
      return P.purpose;
    case 'creator':
      return `I was built by ${P.creator}.`;
    case 'thanks':
      return "You're welcome! Let me know if you need anything else.";
    case 'goodbye':
      return 'Goodbye! Come back anytime.';
    case 'out-of-scope':
    default:
      return `That's outside what I can help with. I can help you with: ${P.capabilities.join('; ')}.`;
  }
}

export interface RespondNodeOptions {
  replyWriter?: ReplyWriter;
}

export const respondNodeFactory = (options?: RespondNodeOptions) => {
  return async function respondNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const ir = state.intentResult;
    const cap = ir?.capabilityCheck;
    const resolution = state.pending_action?.resolution;

    const humanTurns = state.messages.filter((m) => HumanMessage.isInstance(m)).length;
    const due = state.context?.dueReminderCount ?? 0;
    const prefix = humanTurns === 1 && due > 0 ? `You have ${due} due reminder(s) pending attention. ` : '';

    let text: string;
    let clarifying = false;

    if (cap?.blocked || cap?.invalid) {
      text = cap.reason ?? "I can't help with that request. I can help with balances, expenses, wishlist items, and reminders.";
    } else if (resolution === 'deny' || resolution === 'cancel') {
      text = "Okay, I've cancelled that. Nothing was changed.";
    } else if (ir?.group === 'non-domain') {
      const intents = [ir.intent, ...(ir.secondary ?? [])];
      text = prefix + intents.map(smalltalk).join(' ');
    } else if (!ir || ir.group === 'unknown' || state.awaiting_clarification) {
      text = state.awaiting_clarification ?? ASK_REPHRASE;
      clarifying = true;
    } else if (ir.group === 'analysis') {
      text = `${prefix}Here is your analysis. (Note: this is an estimate based on your recorded entries and is not financial, tax, or legal advice.)`;
    } else if (ir.group === 'read') {
      const result = state.readResult;
      if (!result || result.error) {
        text = "I couldn't fetch that right now. Please try again in a moment.";
      } else if (options?.replyWriter) {
        const question = state.slots?.standaloneQuery ?? '';
        text = prefix + (await options.replyWriter.writeReply(ir.intent, result, question));
      } else {
        text = prefix + 'Here is the information you requested based on your records.';
      }
    } else {
      console.warn(`[respond] no reply path for intent=${ir.intent} group=${ir.group}`);
      text = "I couldn't complete that request yet. Please try again or rephrase it.";
    }

    return {
      messages: [new AIMessage(text)],
      readResult: null, // keep it out of later checkpoints
      ...(clarifying ? {} : { awaiting_clarification: null }),
    };
  };
};

export const respondNode = respondNodeFactory();