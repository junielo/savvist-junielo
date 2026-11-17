import { scoreToResult, type Thresholds } from './score-to-result';
import type { ChoiceAnswer } from '@langchain/typesafe';

describe('scoreToResult with Jev System One Domain Gate', () => {
  const thresholds: Thresholds = {
    minConfidence: 0.6,
    minMargin: 0.15,
  };

  it('routes to read_wishlist when Jev Noul confirms isWishlistDomain even if Choice preferred read_expenses', () => {
    const answer: ChoiceAnswer = {
      type: 'choice',
      choice: 'read_expenses',
      confidence: 0.82,
      probabilities: {
        read_expenses: 0.83,
        read_wishlist: 0.13,
        spending_review: 0.03,
        read_record_logs: 0.01,
      },
    };

    const result = scoreToResult(answer, thresholds, 'jev', false, true);

    expect(result.intent).toBe('read_wishlist');
    expect(result.group).toBe('read');
    expect(result.confidence).toBeGreaterThanOrEqual(0.82);
  });

  it('routes to manage_wishlist when Jev Noul confirms isWishlistDomain on write action', () => {
    const answer: ChoiceAnswer = {
      type: 'choice',
      choice: 'manage_expense',
      confidence: 0.8,
      probabilities: {
        manage_expense: 0.8,
        manage_wishlist: 0.15,
      },
    };

    const result = scoreToResult(answer, thresholds, 'jev', false, true);

    expect(result.intent).toBe('manage_wishlist');
    expect(result.group).toBe('write');
  });

  it('keeps normal read_expenses when isWishlistDomain is false', () => {
    const answer: ChoiceAnswer = {
      type: 'choice',
      choice: 'read_expenses',
      confidence: 0.85,
      probabilities: {
        read_expenses: 0.85,
        read_balances: 0.1,
      },
    };

    const result = scoreToResult(answer, thresholds, 'jev', false, false);

    expect(result.intent).toBe('read_expenses');
    expect(result.group).toBe('read');
  });

  it('handles null answer gracefully', () => {
    const result = scoreToResult(null, thresholds, 'jev', false, false);

    expect(result.intent).toBe('unknown');
    expect(result.group).toBe('unknown');
    expect(result.confidence).toBe(0);
  });
});
