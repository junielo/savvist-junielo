export interface StandaloneQueryPromptParams {
  message: string;
  historyText: string;
}

export function buildStandaloneQueryPrompt(params: StandaloneQueryPromptParams): string {
  const { message, historyText } = params;

  return `You are a conversational query rewriter for a personal finance assistant.
Given the recent conversation history and an elliptical or follow-up user message, rewrite the message into a complete, standalone question.

Rules:
1. Resolve all pronouns (it, that, those) and elliptical phrasing (e.g. "what about...", "how about...", "and for...", "how much was that?").
2. Carry forward any active context, predicates, superlatives (e.g. most/least expensive, highest/lowest amount, nearest due date), dates, or constraints from previous turns onto the new subject or entity.
3. Keep the user's intent intact. Do NOT answer the question, offer opinions, or add markdown or explanations.
4. Output ONLY the rewritten standalone question as plain text.

Recent conversation history:
${historyText}

Follow-up user message:
${message}`;
}
