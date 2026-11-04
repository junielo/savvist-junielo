import type { ChoiceAnswer } from '@langchain/typesafe';
import { INTENTS } from './intent.taxonomy';
import type { IntentResult, IntentSource, JevIntentName } from './intent.types';

export interface Thresholds {
  minConfidence: number; // e.g. 0.6, from config
  minMargin: number;     // e.g. 0.15: top vs runner-up
}

export function scoreToResult(
  answer: ChoiceAnswer | null,
  t: Thresholds,
  source: IntentSource,
): IntentResult {
  if (!answer) {
    return { intent: 'unknown', group: 'unknown', confidence: 0, runnerUp: null, probabilities: {}, source };
  }
  const ranked = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]);
  const [topName, topP] = ranked[0] ?? ['', 0];
  const second = ranked[1];
  const margin = topP - (second?.[1] ?? 0);

  const known = topName in INTENTS;
  const ok = known && answer.confidence >= t.minConfidence && margin >= t.minMargin;

  return {
    intent: ok ? (topName as JevIntentName) : 'unknown',
    group: ok ? INTENTS[topName as JevIntentName].group : 'unknown',
    confidence: answer.confidence,
    runnerUp: second ? { intent: second[0], probability: second[1] } : null,
    probabilities: answer.probabilities,
    source,
  };
}