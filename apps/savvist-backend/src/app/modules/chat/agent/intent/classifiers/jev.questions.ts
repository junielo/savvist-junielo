import type { Question } from '@langchain/typesafe';
import { INTENTS } from '../intent.taxonomy';

export const INTENT_QUESTION_ID = 'intent';
export const POLICY_QUESTION_ID = 'prohibited_advice_or_topic';
export const FOLLOW_UP_QUESTION_ID = 'is_follow_up_or_elliptical';
export const WISHLIST_DOMAIN_QUESTION_ID = 'is_wishlist_domain';

export function buildIntentQuestions(): Record<string, Question> {
  const criteria = Object.fromEntries(
    Object.entries(INTENTS).map(([name, def]) => [name, def.description]),
  );
  return {
    [INTENT_QUESTION_ID]: {
      type: 'choice',
      criteria,
      instructions:
        'Which intent does the LAST user message express? A message may contain more than one intent; if so, spread probability across each of them. Use the earlier assistant message only to resolve short follow-ups.',
    },
    [POLICY_QUESTION_ID]: {
      type: 'noul',
      instructions:
        'Does the user message ask for professional financial advice (tax, legal, investment, loans, mortgages, stocks, crypto) or ask how to pressure, threaten, or take legal action against a borrower?',
      criteria: {
        true: 'The message asks for professional legal, tax, or investment advice, stocks/crypto advice, loans/mortgages, or legal action/pressure against a borrower.',
        false: 'The message is about day-to-day personal finance, balances, expenses, wishlist, normal reminders, or conversational talk.',
      },
    },
    [FOLLOW_UP_QUESTION_ID]: {
      type: 'noul',
      instructions:
        'Does the last user message depend on earlier conversation context (such as an elliptical query, follow-up, pronoun, or continuation) rather than being fully self-contained?',
      criteria: {
        true: 'The message depends on previous turns to be understood (for example, "what about my expenses?", "how about tomorrow?", "how much was that?", "and rent?").',
        false: 'The message is a self-contained question, greeting, or command that makes complete sense on its own without earlier context.',
      },
    },
    [WISHLIST_DOMAIN_QUESTION_ID]: {
      type: 'noul',
      instructions:
        'Does the user message ask about, view, list, count, or manage wishlist items, purchases, bought items, or pending items?',
      criteria: {
        true: 'The user message asks to view, list, query, count, or manage wishlist items, purchases made, items bought, or pending items (e.g. "what is my most expensive purchase", "show bought items", "what did I buy in October", "show pending items", "how many items did I buy", "what should I buy next", "add shoes to wishlist").',
        false: 'The user message is about recurring bills, regular living expenses, rent, utilities, account balances, salary, reminders, or general talk.',
      },
    },
  };
}