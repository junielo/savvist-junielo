export const NON_DOMAIN_INTENTS = [
  'greeting',
  'about-assistant',   // "what are you"
  'capabilities',      // "what can you do"
  'purpose',           // "what is your purpose"
  'creator',           // "who made you"
  'thanks',
  'goodbye',
  'out-of-scope',      // clearly unrelated to the app
] as const;

export const READ_INTENTS = [
  'read_balances',
  'read_expenses',
  'read_wishlist',
  'read_record_logs',
  'read_reminders',
  'read_profile',
] as const;

export const WRITE_INTENTS = [
  'update_base_salary',
  'manage_account_entry',
  'manage_entry_record',
  'manage_expense',
  'manage_wishlist',
  'swap_wishlist_priority',
  'manage_reminder',
  'manage_memory',
] as const;

export const ANALYSIS_INTENTS = [
  'check_affordability',
  'check_spending_range',
  'estimate_when_available',
  'spending_review',
  'what_if_analysis',
] as const;

export const INTENT_NAMES = [
  ...NON_DOMAIN_INTENTS,
  ...READ_INTENTS,
  ...WRITE_INTENTS,
  ...ANALYSIS_INTENTS,
] as const;

export type JevIntentName = (typeof INTENT_NAMES)[number];
export type IntentName = JevIntentName | 'unknown';

export type IntentGroup = 'non-domain' | 'read' | 'write' | 'analysis' | 'unknown';
export type IntentSource = 'jev' | 'keyword' | 'guard';

export interface IntentResult {
  intent: IntentName;
  secondary?: JevIntentName[];
  group: IntentGroup;
  confidence: number;
  runnerUp: { intent: string; probability: number } | null;
  probabilities: Record<string, number>;
  source: IntentSource;
  // Filled by capability-check, read by routeAfterCapability
  capabilityCheck?: { blocked?: boolean; invalid?: boolean; reason?: string };
}

export interface ClassifierInput {
  message: string;
  previousAssistantMessage?: string;
}
