// jev.client.ts
import { TypeSafeClassifier, type ChoiceAnswer } from '@langchain/typesafe';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { ClassifierInput } from '../intent.types';
import { buildIntentQuestions, INTENT_QUESTION_ID, POLICY_QUESTION_ID, FOLLOW_UP_QUESTION_ID } from './jev.questions';
import { ObservabilityService } from '../../observability/observability.service';

export interface JevClientOptions {
  model?: string;      // default 'jev-latest'; put in config
  timeoutMs?: number;
  maxRetries?: number;
  observability?: ObservabilityService;
}

export interface JevIntentClassification {
  answer: ChoiceAnswer;
  isFollowUp: boolean;
}

export interface EntityCandidate {
  id?: string;
  name: string;
}

export interface EntityMatchResult {
  matched: EntityCandidate | null;
  confidence: number;
}

export class JevClient {
  private readonly classifier: TypeSafeClassifier;

  constructor(private readonly opts: JevClientOptions = {}) {
    this.classifier = new TypeSafeClassifier({
      questions: buildIntentQuestions(),
      model: opts.model ?? 'jev-latest',
      timeout: opts.timeoutMs ?? 5000,
      maxRetries: opts.maxRetries ?? 1,
      // apiKey falls back to process.env.TYPESAFE_API_KEY
    });
  }

  async classifyIntent(input: ClassifierInput): Promise<JevIntentClassification> {
    // State = previous assistant message + current user message
    const state = [
      ...(input.previousAssistantMessage ? [new AIMessage(input.previousAssistantMessage)] : []),
      new HumanMessage(input.message),
    ];
    const res = await this.classifier.invoke(state);
    const answer = res.choices[INTENT_QUESTION_ID];
    if (!answer) throw new Error('Jev returned no intent answer');

    const followUpNoul = res.nouls?.[FOLLOW_UP_QUESTION_ID];
    const isFollowUp = Boolean(input.previousAssistantMessage) && (followUpNoul?.noul ?? 0) >= 0.7;

    this.opts.observability?.setLLMCall('jev-classifier', {
      input,
      answer,
      isFollowUp,
      followUpNoul,
    });
    return { answer, isFollowUp };
  }

  /**
   * Evaluates whether a user message crosses the policy boundary (investment/tax/legal advice,
   * complex products, debt enforcement threats). Uses calibrated Noul probability threshold (>= 0.7).
   */
  async checkSemanticPolicy(message: string): Promise<{ isProhibited: boolean; probability: number }> {
    try {
      const state = [new HumanMessage(message)];
      const res = await this.classifier.invoke(state);
      const noulAnswer = res.nouls?.[POLICY_QUESTION_ID];
      const probability = noulAnswer ? noulAnswer.noul : 0;
      this.opts.observability?.setLLMCall('jev-policy-check', { message, noulAnswer });
      return { isProhibited: probability >= 0.7, probability };
    } catch {
      return { isProhibited: false, probability: 0 };
    }
  }

  /**
   * Evaluates specifically if the user input depends on earlier conversation history.
   */
  async checkIsFollowUp(input: ClassifierInput): Promise<{ isFollowUp: boolean; probability: number }> {
    if (!input.previousAssistantMessage) {
      return { isFollowUp: false, probability: 0 };
    }
    try {
      const state = [
        new AIMessage(input.previousAssistantMessage),
        new HumanMessage(input.message),
      ];
      const res = await this.classifier.invoke(state);
      const followUpNoul = res.nouls?.[FOLLOW_UP_QUESTION_ID];
      const probability = followUpNoul ? followUpNoul.noul : 0;
      this.opts.observability?.setLLMCall('jev-follow-up-check', { input, followUpNoul });
      return { isFollowUp: probability >= 0.7, probability };
    } catch {
      return { isFollowUp: false, probability: 0 };
    }
  }

  /**
   * Semantically matches a query or slot name (e.g. "water bill") against existing user candidate items (e.g. "water").
   * First checks for exact match. If no exact match, uses Jev Choice + companion Noul to find the matching entity.
   */
  async resolveEntityMatch(
    searchQuery: string,
    candidates: EntityCandidate[],
  ): Promise<EntityMatchResult> {
    if (!searchQuery || !candidates || candidates.length === 0) {
      return { matched: null, confidence: 0 };
    }

    const trimmedQuery = searchQuery.trim().toLowerCase();

    // 1. Exact match fast path in code
    const exact = candidates.find((c) => c.name.trim().toLowerCase() === trimmedQuery);
    if (exact) {
      return { matched: exact, confidence: 1.0 };
    }

    // 2. Query Jev with Choice among candidates + companion Noul
    try {
      const criteria: Record<string, string> = {};
      for (const c of candidates) {
        criteria[c.name] = `The item or expense named "${c.name}"`;
      }

      const matchClassifier = new TypeSafeClassifier({
        questions: {
          matched_item: {
            type: 'choice',
            criteria,
            instructions: `Which existing item or expense is the user referring to by "${searchQuery}"?`,
          },
          matches_any: {
            type: 'noul',
            instructions: `Does "${searchQuery}" refer to any of the listed items or expenses?`,
            criteria: {
              true: 'The user is referring to one of the listed items or expenses (for example using a synonym, utility type, bill name, or variation).',
              false: 'The user is referring to a completely different item or expense that is not listed here.',
            },
          },
        },
        model: this.opts.model ?? 'jev-latest',
        timeout: this.opts.timeoutMs ?? 5000,
        maxRetries: this.opts.maxRetries ?? 1,
      });

      const res = await matchClassifier.invoke([new HumanMessage(searchQuery)]);
      const noulAnswer = res.nouls?.['matches_any'];
      const choiceAnswer = res.choices?.['matched_item'];
      const probability = noulAnswer ? noulAnswer.noul : 0;

      if (probability >= 0.7 && choiceAnswer?.choice) {
        const found = candidates.find((c) => c.name === choiceAnswer.choice);
        if (found) {
          this.opts.observability?.setLLMCall('jev-entity-match', {
            searchQuery,
            candidates: candidates.map((c) => c.name),
            matched: found.name,
            confidence: probability,
          });
          return { matched: found, confidence: probability };
        }
      }

      // If companion Noul rejected (< 0.4), do not match
      if (probability < 0.4) {
        return { matched: null, confidence: probability };
      }
    } catch {
      // If Jev throws (e.g. offline, rate limit, timeout), degrade gracefully to substring matching
    }

    // 3. Fallback: case-insensitive substring match
    const sub =
      candidates.find((c) => c.name.toLowerCase().includes(trimmedQuery)) ??
      candidates.find((c) => trimmedQuery.includes(c.name.toLowerCase()));

    return { matched: sub ?? null, confidence: sub ? 0.6 : 0 };
  }
}