import { CapabilityRuleContext, CapabilityCheckOutcome } from '../capability-check.service';

/**
 * Account type cannot be changed once an account has records.
 */
export function accountTypeLockRule(ctx: CapabilityRuleContext): CapabilityCheckOutcome | null {
  if (ctx.intent !== 'manage_account_entry') return null;

  const targetType = ctx.slots?.accountType ?? ctx.slots?.type;
  const isTypeChange = ctx.slots?.action === 'change_type' || !!targetType;

  if (isTypeChange && ctx.slots?.hasRecords) {
    return {
      invalid: true,
      reason: 'Changing an account type after it has records is not permitted.',
    };
  }
  return null;
}
