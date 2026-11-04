import type { Question } from '@langchain/typesafe';
import { INTENTS } from '../intent.taxonomy';

export const INTENT_QUESTION_ID = 'intent';

export function buildIntentQuestions(): Record<string, Question> {
  const criteria = Object.fromEntries(
    Object.entries(INTENTS).map(([name, def]) => [name, def.description]),
  );
  return {
    [INTENT_QUESTION_ID]: {
      type: 'choice',
      criteria,
      instructions:
        'Which intent does the LAST user message express? Use the earlier assistant message only to resolve short follow-ups.',
    },
  };
}