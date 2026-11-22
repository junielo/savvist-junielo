import { CapabilityRuleContext, CapabilityCheckOutcome } from '../capability-check.service';
import { normalizeDate } from '../../tools/date-utils';

/**
 * Rejects reminder dates in the past. Today is allowed.
 */
export function reminderDateRule(ctx: CapabilityRuleContext): CapabilityCheckOutcome | null {
  if (ctx.intent !== 'manage_reminder') return null;

  const reminderDate = ctx.slots?.date ?? ctx.slots?.reminderDate;
  if (reminderDate && typeof reminderDate === 'string') {
    const today = ctx.today || new Date().toISOString().slice(0, 10);
    const normalized = normalizeDate(reminderDate, today);
    if (normalized.ok) {
      if (normalized.date < today) {
        return {
          invalid: true,
          reason: 'Reminder dates cannot be in the past.',
        };
      }
    } else if (reminderDate < today && /^\d{4}-\d{2}-\d{2}$/.test(reminderDate)) {
      return {
        invalid: true,
        reason: 'Reminder dates cannot be in the past.',
      };
    }
  }
  return null;
}
