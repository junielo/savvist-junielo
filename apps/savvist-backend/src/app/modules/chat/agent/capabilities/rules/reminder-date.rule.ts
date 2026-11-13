import { CapabilityRuleContext, CapabilityCheckOutcome } from '../capability-check.service';

/**
 * Rejects reminder dates in the past. Today is allowed.
 */
export function reminderDateRule(ctx: CapabilityRuleContext): CapabilityCheckOutcome | null {
  if (ctx.intent !== 'manage_reminder') return null;

  const reminderDate = ctx.slots?.date ?? ctx.slots?.reminderDate;
  if (reminderDate && typeof reminderDate === 'string' && ctx.today) {
    if (reminderDate < ctx.today) {
      return {
        invalid: true,
        reason: 'Reminder dates cannot be in the past.',
      };
    }
  }
  return null;
}
