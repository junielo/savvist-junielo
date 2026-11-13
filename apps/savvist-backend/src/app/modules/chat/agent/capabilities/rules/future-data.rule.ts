import { CapabilityRuleContext, CapabilityCheckOutcome } from '../capability-check.service';

/**
 * Rejects balance records dated in the future.
 */
export function futureDataRule(ctx: CapabilityRuleContext): CapabilityCheckOutcome | null {
  if (ctx.intent !== 'manage_entry_record') return null;

  const targetDate = ctx.slots?.date ?? ctx.slots?.targetDate;
  if (targetDate && typeof targetDate === 'string' && ctx.today) {
    if (targetDate > ctx.today) {
      return {
        invalid: true,
        reason: 'A balance record cannot be dated in the future.',
      };
    }
  }
  return null;
}
