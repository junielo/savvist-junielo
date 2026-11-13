import { CapabilityRuleContext, CapabilityCheckOutcome } from '../capability-check.service';

/**
 * Editing or deleting record logs (audit trail) is blocked.
 */
export function readOnlyDataRule(ctx: CapabilityRuleContext): CapabilityCheckOutcome | null {
  const isRecordLogTarget =
    ctx.slots?.targetCollection === 'record_logs' ||
    ctx.slots?.collection === 'record_logs' ||
    ctx.intent === 'read_record_logs';

  const isWriteAttempt =
    ctx.group === 'write' ||
    /\b(edit|delete|remove|clear|modify|update|erase)\b/i.test(ctx.message);

  if (isRecordLogTarget && isWriteAttempt && ctx.intent !== 'read_record_logs') {
    return {
      blocked: true,
      reason: 'Record logs are read-only and cannot be edited or deleted.',
    };
  }
  return null;
}
