// jev.classifier.ts
import type { ClassifierInput, IntentResult } from '../intent.types';
import { JevClient } from './jev.client';
import { scoreToResult, type Thresholds } from '../score-to-result';

export class JevIntentClassifier /* implements IntentClassifier */ {
  constructor(
    private readonly jev: JevClient,
    private readonly thresholds: Thresholds,
    private readonly fallback?: { classify(i: ClassifierInput): Promise<IntentResult> }, // keyword.classifier
  ) {}

  async classify(input: ClassifierInput): Promise<IntentResult> {
    try {
      const { answer, isFollowUp } = await this.jev.classifyIntent(input);
      return scoreToResult(answer, this.thresholds, 'jev', isFollowUp);
    } catch {
      // Don't log the error body: TypeSafe errors can echo the user's message
      if (this.fallback) return this.fallback.classify(input);
      return scoreToResult(null, this.thresholds, 'jev');
    }
  }
}