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

/** Extras are non-domain intents (for greeting/smalltalk) or read intents (for multi-intent read queries). */
function isExtra(topGroup: string, name: string): name is JevIntentName {
  if (!isKnown(name) || name === 'out-of-scope') return false;
  const group = INTENTS[name].group;
  if (topGroup === 'non-domain') {
    return group === 'non-domain';
  }
  if (topGroup === 'read') {
    return group === 'read';
  }
  return false;
}

export function scoreToResult(
  answer: ChoiceAnswer | null,
  t: Thresholds,
  source: IntentSource,
  isFollowUp = false,
  isWishlistDomain = false,
): IntentResult {
  if (!answer) {
    return {
      intent: 'unknown',
      group: 'unknown',
      confidence: 0,
      runnerUp: null,
      probabilities: {},
      source,
      isFollowUp,
    };
  }

  const probabilities = { ...answer.probabilities };

  // Jev System One Domain Gate:
  // When Jev's parallel Noul question verifies the message is in the wishlist domain (probability >= 0.7)
  // and the Choice probabilities leaned toward recurring expenses (or general review),
  // reallocate the mass to the verified wishlist domain before sorting and computing margin.
  if (isWishlistDomain) {
    const isWrite = Object.entries(probabilities).some(
      ([k, p]) => k.startsWith('manage_') && k !== 'manage_memory' && p > 0.3,
    );
    const targetWishlistIntent = isWrite ? 'manage_wishlist' : 'read_wishlist';

    const expenseP = probabilities['read_expenses'] ?? 0;
    const manageExpenseP = probabilities['manage_expense'] ?? 0;
    const reviewP = probabilities['spending_review'] ?? 0;
    const combinedP = Math.max(
      (probabilities[targetWishlistIntent] ?? 0) + expenseP + manageExpenseP + reviewP,
      0.95,
    );

    delete probabilities['read_expenses'];
    delete probabilities['manage_expense'];
    delete probabilities['spending_review'];
    probabilities[targetWishlistIntent] = combinedP;
  }

  const ranked: [string, number][] = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  const [topName, topP] = ranked[0] ?? ['', 0];
  const second = ranked[1];

  const known = isKnown(topName);
  const topGroup = known ? INTENTS[topName].group : 'unknown';
  const minSecondary = t.minSecondary ?? DEFAULT_MIN_SECONDARY;

  // Extra intents when top intent is non-domain or read
  const extras: [JevIntentName, number][] =
    known && (topGroup === 'non-domain' || topGroup === 'read')
      ? ranked
          .slice(1)
          .filter((e): e is [JevIntentName, number] => isExtra(topGroup, e[0]) && e[1] >= minSecondary)
          .slice(0, MAX_SECONDARY)
      : [];

  // Probability mass of everything we accept, compared against the next intent outside it
  const accepted = new Set<string>([topName, ...extras.map(([name]) => name)]);
  const mass = extras.reduce((sum, [, p]) => sum + p, topP);
  const next = ranked.find(([name]) => !accepted.has(name));
  const margin = mass - (next?.[1] ?? 0);

  const confidence = isWishlistDomain ? Math.max(answer.confidence, mass) : answer.confidence;
  const score = extras.length > 0 ? Math.max(confidence, mass) : confidence;
  const ok = known && score >= t.minConfidence && margin >= t.minMargin;

  return {
    intent: ok ? (topName as JevIntentName) : 'unknown',
    secondary: ok ? extras.map(([name]) => name) : [],
    group: ok ? INTENTS[topName as JevIntentName].group : 'unknown',
    confidence,
    runnerUp: second ? { intent: second[0], probability: second[1] } : null,
    probabilities,
    source,
    isFollowUp,
  };
}