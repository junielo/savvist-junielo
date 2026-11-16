import type { JevIntentName } from './intent.types';

export type RiskTier = 'low' | 'medium' | 'high';

export const INTENT_RISK_TIERS: Partial<Record<JevIntentName, RiskTier>> = {
  manage_memory: 'low',
  manage_reminder: 'low',
  update_base_salary: 'medium',
  manage_account_entry: 'medium',
  manage_expense: 'medium',
  manage_wishlist: 'medium',
  swap_wishlist_priority: 'medium',
  manage_entry_record: 'high',
};

export function getRiskTier(intent: string): RiskTier {
  return INTENT_RISK_TIERS[intent as JevIntentName] ?? 'medium';
}
