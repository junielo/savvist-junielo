import type { ChoiceAnswer } from '@langchain/typesafe';
import { INTENTS } from './intent.taxonomy';
import type { IntentResult, IntentSource, JevIntentName } from './intent.types';

export interface Thresholds {
  minConfidence: number;  // e.g. 0.6, from config
  minMargin: number;      // e.g. 0.15: accepted intents vs next intent
  minSecondary?: number;  // e.g. 0.25: extra non-domain intents, optional
}

const DEFAULT_MIN_SECONDARY = 0.25;
const MAX_SECONDARY = 2;

function isKnown(name: string): name is JevIntentName {
  return name in INTENTS;
}

/** Extras are non-domain only, and never 'out-of-scope'. */
function isExtra(name: string): name is JevIntentName {
  return isKnown(name) && name !== 'out-of-scope' && INTENTS[name].group === 'non-domain';
}

export function scoreToResult(
  answer: ChoiceAnswer | null,
  t: Thresholds,
  source: IntentSource,
): IntentResult {
  if (!answer) {
    return { intent: 'unknown', group: 'unknown', confidence: 0, runnerUp: null, probabilities: {}, source };
  }
  const ranked: [string, number][] = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]);
  const [topName, topP] = ranked[0] ?? ['', 0];
  const second = ranked[1];

  const known = isKnown(topName);
  const minSecondary = t.minSecondary ?? DEFAULT_MIN_SECONDARY;

  // Extra intents only when the top intent is itself non-domain
  const extras: [JevIntentName, number][] =
    known && isExtra(topName)
      ? ranked
          .slice(1)
          .filter((e): e is [JevIntentName, number] => isExtra(e[0]) && e[1] >= minSecondary)
          .slice(0, MAX_SECONDARY)
      : [];

  // Probability mass of everything we accept, compared against the next intent outside it
  const accepted = new Set<string>([topName, ...extras.map(([name]) => name)]);
  const mass = extras.reduce((sum, [, p]) => sum + p, topP);
  const next = ranked.find(([name]) => !accepted.has(name));
  const margin = mass - (next?.[1] ?? 0);

  const score = extras.length > 0 ? Math.max(answer.confidence, mass) : answer.confidence;
  const ok = known && score >= t.minConfidence && margin >= t.minMargin;

  return {
    intent: ok ? (topName as JevIntentName) : 'unknown',
    secondary: ok ? extras.map(([name]) => name) : [],
    group: ok ? INTENTS[topName as JevIntentName].group : 'unknown',
    confidence: answer.confidence,
    runnerUp: second ? { intent: second[0], probability: second[1] } : null,
    probabilities: answer.probabilities,
    source,
  };
}