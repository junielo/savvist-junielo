import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { AgentStateType } from '../agent.state';
import { ASSISTANT_PROFILE as P } from '../../intent/assistant-profile';

const ESTIMATE_NOTE =
  '(Note: this is an estimate based on your recorded entries and is not financial, tax, or legal advice.)';

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

export async function respondNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const ir = state.intentResult;
  const cap = ir?.capabilityCheck;
  const resolution = state.pending_action?.resolution;

  // Reminder prefix only on the first reply, and only when it's a normal answer
  const humanTurns = state.messages.filter((m) => HumanMessage.isInstance(m)).length;
  const due = state.context?.dueReminderCount ?? 0;
  const prefix = humanTurns === 1 && due > 0 ? `You have ${due} due reminder(s) pending attention. ` : '';

  let text: string;
  let clarifying = false;

  if (cap?.blocked || cap?.invalid) {
    // 1. Policy refusal: always first, never fall through to success
    text = cap.reason ?? "I can't help with that request. I can help with balances, expenses, wishlist items, and reminders.";
  } else if (resolution === 'deny' || resolution === 'cancel') {
    // 2. User declined or the action expired
    text = "Okay, I've cancelled that. Nothing was changed.";
  } else if (ir?.group === 'non-domain') {
    // 3. Small talk
    text = prefix + smalltalk(ir.intent);
  } else if (!ir || ir.group === 'unknown' || state.awaiting_clarification) {
    // 4. Clarification: the question text comes from the clarify node
    text = state.awaiting_clarification ?? ASK_REPHRASE;
    clarifying = true;
  } else if (ir.group === 'analysis') {
    // TODO: render real figures from the analyze node's result
    text = `${prefix}Here is your analysis. ${ESTIMATE_NOTE}`;
  } else {
    // 5. Reaching here means read/write has no renderer yet, or a routing bug.
    console.warn(`[respond] no reply path for intent=${ir.intent} group=${ir.group}`);
    text = "I couldn't complete that request yet. Please try again or rephrase it.";
  }

  return {
    messages: [new AIMessage(text)],
    // Clear a stale clarification unless we are asking one right now
    ...(clarifying ? {} : { awaiting_clarification: null }),
  };
}