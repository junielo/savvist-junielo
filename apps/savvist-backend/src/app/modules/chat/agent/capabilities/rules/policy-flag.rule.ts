import { CapabilityRuleContext, CapabilityCheckOutcome } from '../capability-check.service';

/**
 * Enforces config flags for deletes & base salary changes.
 */
export function policyFlagRule(ctx: CapabilityRuleContext): CapabilityCheckOutcome | null {
  if (ctx.config?.allowSalaryChange === false && ctx.intent === 'update_base_salary') {
    return {
      blocked: true,
      reason: 'Updating base salary via chat is disabled by configuration policy.',
    };
  }

  const isDelete =
    ctx.slots?.action === 'delete' ||
    /\b(delete|remove|erase)\b/i.test(ctx.message);

  if (ctx.config?.allowDeletes === false && isDelete && ctx.group === 'write') {
    return {
      blocked: true,
      reason: 'Deleting records via chat is disabled by configuration policy.',
    };
  }

  return null;
}
