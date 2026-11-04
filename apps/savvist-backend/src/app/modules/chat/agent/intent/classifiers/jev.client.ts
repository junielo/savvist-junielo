// jev.client.ts
import { TypeSafeClassifier, type ChoiceAnswer } from '@langchain/typesafe';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { ClassifierInput } from '../intent.types';
import { buildIntentQuestions, INTENT_QUESTION_ID } from './jev.questions';

export interface JevClientOptions {
  model?: string;      // default 'jev-latest'; put in config
  timeoutMs?: number;
  maxRetries?: number;
}

export class JevClient {
  private readonly classifier: TypeSafeClassifier;

  constructor(opts: JevClientOptions = {}) {
    this.classifier = new TypeSafeClassifier({
      questions: buildIntentQuestions(),
      model: opts.model ?? 'jev-latest',
      timeout: opts.timeoutMs ?? 5000,
      maxRetries: opts.maxRetries ?? 1,
      // apiKey falls back to process.env.TYPESAFE_API_KEY
    });
  }

  async classifyIntent(input: ClassifierInput): Promise<ChoiceAnswer> {
    // State = previous assistant message + current user message
    const state = [
      ...(input.previousAssistantMessage ? [new AIMessage(input.previousAssistantMessage)] : []),
      new HumanMessage(input.message),
    ];
    const res = await this.classifier.invoke(state);
    const answer = res.choices[INTENT_QUESTION_ID];
    if (!answer) throw new Error('Jev returned no intent answer');
    return answer;
  }
}