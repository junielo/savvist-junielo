import { CapabilityRuleContext, CapabilityCheckOutcome } from '../capability-check.service';

const DEFAULT_LARGE_AMOUNT_MULTIPLE = 6;

/**
 * Blocks affordability, "when", or what-if for very large amounts (> LARGE_AMOUNT_MULTIPLE * netIncome).
 */
export function largeAmountRule(ctx: CapabilityRuleContext): CapabilityCheckOutcome | null {
  const analysisIntents = [
    'check_affordability',
    'check_spending_range',
    'estimate_when_available',
    'what_if_analysis',
  ];

  if (!analysisIntents.includes(ctx.intent)) return null;

  const amount = ctx.slots?.amount ?? ctx.slots?.value;
  const netIncome = ctx.user?.netIncome ?? ctx.user?.baseSalary ?? 0;
  const multiple = ctx.config?.largeAmountMultiple ?? DEFAULT_LARGE_AMOUNT_MULTIPLE;

  if (typeof amount === 'number' && netIncome > 0 && amount > multiple * netIncome) {
    return {
      blocked: true,
      reason: `The requested amount exceeds the safe analysis threshold (${multiple}x monthly income) for daily personal finance estimates.`,
    };
  }
  return null;
}
