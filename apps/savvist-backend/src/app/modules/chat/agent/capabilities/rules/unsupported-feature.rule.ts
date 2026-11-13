import { CapabilityRuleContext, CapabilityCheckOutcome } from '../capability-check.service';

/**
 * Blocks out-of-scope requests:
 * - "Undo that"
 * - Renaming or deleting conversation, changing time zone
 * - Tax, legal, or investment advice
 * - Loans, mortgages, stocks, crypto, property
 * - Pressuring or threatening a borrower
 */
export async function unsupportedFeatureRule(
  ctx: CapabilityRuleContext,
): Promise<CapabilityCheckOutcome | null> {
  const lowerMsg = ctx.message.trim().toLowerCase();

  // 1. Explicit deterministic blocks
  if (/^(undo|undo that|revert that)$/i.test(lowerMsg)) {
    return {
      blocked: true,
      reason: '"Undo that" is not supported. Please specify the exact change you would like to make.',
    };
  }

  if (/\b(rename conversation|delete conversation|change time ?zone)\b/i.test(lowerMsg)) {
    return {
      blocked: true,
      reason: 'Managing conversations and changing timezone settings must be done in account settings.',
    };
  }

  if (ctx.intent === 'out-of-scope') {
    return {
      blocked: true,
      reason: "That request is outside what I can help with. I can help with balances, expenses, wishlist items, and reminders.",
    };
  }

  // 2. Semantic boundary check via Jev (calibrated Noul >= 0.7)
  if (ctx.jevClient) {
    const semanticRes = await ctx.jevClient.checkSemanticPolicy(ctx.message);
    if (semanticRes.isProhibited) {
      return {
        blocked: true,
        reason:
          'Savvist covers daily money management only and does not provide investment, legal, or tax advice, or assist with loans, investments, and debt recovery actions.',
      };
    }
  }

  return null;
}
