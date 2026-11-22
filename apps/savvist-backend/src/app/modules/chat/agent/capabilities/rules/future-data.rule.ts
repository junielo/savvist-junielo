import { CapabilityRuleContext, CapabilityCheckOutcome } from '../capability-check.service';
import { normalizeDate } from '../../tools/date-utils';

/**
 * Rejects balance records dated in the future.
 */
export function futureDataRule(ctx: CapabilityRuleContext): CapabilityCheckOutcome | null {
  if (ctx.intent !== 'manage_entry_record') return null;

  const targetDate = ctx.slots?.date ?? ctx.slots?.targetDate;
  if (targetDate && typeof targetDate === 'string') {
    const today = ctx.today || new Date().toISOString().slice(0, 10);
    const normalized = normalizeDate(targetDate, today);
    if (normalized.ok) {
      if (normalized.date > today) {
        return {
          invalid: true,
          reason: 'A balance record cannot be dated in the future.',
        };
      }
    } else if (targetDate > today && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return {
        invalid: true,
        reason: 'A balance record cannot be dated in the future.',
      };
    }
  }
  return null;
}
