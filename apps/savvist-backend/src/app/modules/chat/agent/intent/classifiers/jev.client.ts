// jev.client.ts
import { TypeSafeClassifier, type ChoiceAnswer } from '@langchain/typesafe';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { ClassifierInput } from '../intent.types';
import { buildIntentQuestions, INTENT_QUESTION_ID, POLICY_QUESTION_ID, FOLLOW_UP_QUESTION_ID, WISHLIST_DOMAIN_QUESTION_ID } from './jev.questions';
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
  isWishlistDomain: boolean;
  wishlistProbability: number;
}

export interface EntityCandidate {
  id?: string;
  name: string;
}

export interface EntityMatchResult {
  matched: EntityCandidate | null;
  confidence: number;
}

export interface ConfirmationResolutionResult {
  resolution: 'confirm' | 'deny' | 'correction' | 'new_request';
  confidence: number;
  hasSecondaryRequest: boolean;
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

    const wishlistNoul = res.nouls?.[WISHLIST_DOMAIN_QUESTION_ID];
    const wishlistProbability = wishlistNoul?.noul ?? 0;
    const isWishlistDomain = wishlistProbability >= 0.7;

    this.opts.observability?.setLLMCall('jev-classifier', {
      input,
      answer,
      isFollowUp,
      followUpNoul,
      wishlistNoul,
      isWishlistDomain,
    });
    return { answer, isFollowUp, isWishlistDomain, wishlistProbability };
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
   * Evaluates how the user responded to a pending action confirmation prompt using Jev Choice + companion Noul.
   * Returns whether they confirmed, denied, gave a correction, or asked a new request,
   * along with whether an additional question/command was asked.
   */
  async resolveConfirmationResponse(
    message: string,
    actionDescription?: string,
  ): Promise<ConfirmationResolutionResult> {
    try {
      const confirmationClassifier = new TypeSafeClassifier({
        questions: {
          confirmation_intent: {
            type: 'choice',
            instructions: actionDescription
              ? `Given the assistant's proposed action: "${actionDescription}", how is the user responding?`
              : 'How is the user responding to the proposed action confirmation?',
            criteria: {
              confirm:
                'The user agrees, approves, confirms, or wants to proceed with the action (e.g. yes, sure, looks good, proceed, go ahead, yes please, sounds good, do it, approved), even if they also append an additional question or command.',
              deny:
                'The user explicitly cancels, rejects, stops, or says no to the action (e.g. no, cancel, stop, nevermind, don\'t do that, abort, disagree), even if they also append an additional question or command.',
              correction:
                'The user wants to modify or correct details of the proposed action (e.g. change amount, different name, different day, instead of X make it Y).',
              new_request:
                'The user does not agree or disagree, but completely ignores or bypasses the confirmation prompt to talk about something else without answering.',
            },
          },
          is_confirming: {
            type: 'noul',
            instructions: 'Does the user message indicate approval, agreement, or confirmation to proceed with the action?',
            criteria: {
              true: 'The user agrees, approves, confirms, or wants to proceed (e.g. yes, sure, proceed, yes please, sounds good, do it, go ahead, approved).',
              false: 'The user does not confirm, or denies, cancels, corrects, or asks an unrelated question.',
            },
          },
          is_denying: {
            type: 'noul',
            instructions: 'Does the user message explicitly cancel, reject, deny, or say no to the action?',
            criteria: {
              true: 'The user explicitly rejects, denies, stops, cancels, or says no to the action (e.g. no, cancel, stop, nevermind, don\'t do that, abort).',
              false: 'The user does not reject or cancel.',
            },
          },
          has_secondary_request: {
            type: 'noul',
            instructions:
              'Does the user message ask an additional question or command beyond just confirming, denying, or correcting the action?',
            criteria: {
              true: 'The user message asks an additional question, command, or request to view or do something else (e.g. and also show my expenses, and what is my balance).',
              false: 'The user message only responds to the confirmation without asking any additional questions or actions.',
            },
          },
        },
        model: this.opts.model ?? 'jev-latest',
        timeout: this.opts.timeoutMs ?? 5000,
        maxRetries: this.opts.maxRetries ?? 1,
      });

      const res = await confirmationClassifier.invoke([new HumanMessage(message)]);
      const choice = res.choices?.['confirmation_intent']?.choice as
        | 'confirm'
        | 'deny'
        | 'correction'
        | 'new_request'
        | undefined;
      const confidence = res.choices?.['confirmation_intent']?.confidence ?? 0;
      const noulAnswer = res.nouls?.['has_secondary_request'];
      const probability = noulAnswer ? noulAnswer.noul : 0;
      const hasSecondaryRequest = probability >= 0.7;

      const isConfirming = (res.nouls?.['is_confirming']?.noul ?? 0) >= 0.7;
      const isDenying = (res.nouls?.['is_denying']?.noul ?? 0) >= 0.7;

      let resolution = choice ?? 'new_request';

      // TypeSafe truth-table: If Jev's companion Noul detects confirmation or denial,
      // it takes precedence even when an additional secondary request is present.
      if (isConfirming || choice === 'confirm') {
        resolution = 'confirm';
      } else if (isDenying || choice === 'deny') {
        resolution = 'deny';
      }

      this.opts.observability?.setLLMCall('jev-confirmation-resolution', {
        message,
        actionDescription,
        resolution,
        confidence,
        hasSecondaryRequest,
        probability,
      });

      return {
        resolution,
        confidence,
        hasSecondaryRequest,
      };
    } catch {
      return {
        resolution: 'new_request',
        confidence: 0,
        hasSecondaryRequest: false,
      };
    }
  }

  /**
   * Helper for checking if a confirmation contains a secondary request.
   */
  async checkCompoundConfirmation(
    message: string,
  ): Promise<{ isConfirmationOrDenial: boolean; hasSecondaryRequest: boolean; probability: number }> {
    const res = await this.resolveConfirmationResponse(message);
    const isConfirmationOrDenial = res.resolution === 'confirm' || res.resolution === 'deny';
    return {
      isConfirmationOrDenial,
      hasSecondaryRequest: res.hasSecondaryRequest,
      probability: res.confidence,
    };
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