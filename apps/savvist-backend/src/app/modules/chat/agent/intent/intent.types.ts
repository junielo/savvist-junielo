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

// Add 'read-...', 'write-...', 'analysis-...' intents here later.
export const INTENT_NAMES = [...NON_DOMAIN_INTENTS] as const;

export type JevIntentName = (typeof INTENT_NAMES)[number];
export type IntentName = JevIntentName | 'unknown';

export type IntentGroup = 'non-domain' | 'read' | 'write' | 'analysis' | 'unknown';
export type IntentSource = 'jev' | 'keyword' | 'guard';

export interface IntentResult {
  intent: IntentName;
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