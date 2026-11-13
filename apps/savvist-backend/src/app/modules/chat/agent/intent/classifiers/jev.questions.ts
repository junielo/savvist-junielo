import type { Question } from '@langchain/typesafe';
import { INTENTS } from '../intent.taxonomy';

export const INTENT_QUESTION_ID = 'intent';
export const POLICY_QUESTION_ID = 'prohibited_advice_or_topic';

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
  };
}