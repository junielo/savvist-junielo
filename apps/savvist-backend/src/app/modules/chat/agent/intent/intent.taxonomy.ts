import type { IntentGroup, JevIntentName } from './intent.types';

interface IntentDef {
  group: IntentGroup;
  description: string; // sent to Jev
}

export const INTENTS: Record<JevIntentName, IntentDef> = {
  greeting: {
    group: 'non-domain',
    description:
      'A hello or social opener with no request, e.g. "hi", "hello", "good morning", "hey there".',
  },
  'about-assistant': {
    group: 'non-domain',
    description:
      'Asks what or who the assistant is, e.g. "what are you", "are you a bot", "what is Savvist AI". Not about features and not about who built it.',
  },
  capabilities: {
    group: 'non-domain',
    description:
      'Asks what the assistant can do or help with, e.g. "what can you do", "how can you help me", "what features do you have".',
  },
  purpose: {
    group: 'non-domain',
    description:
      'Asks why the assistant exists or what its purpose is, e.g. "what is your purpose", "why were you made". Not a request for a feature list.',
  },
  creator: {
    group: 'non-domain',
    description:
      'Asks who built, made, trained or owns the assistant, e.g. "who made you", "who created you", "which company are you from".',
  },
  thanks: {
    group: 'non-domain',
    description: 'Expresses thanks or appreciation, e.g. "thanks", "thank you so much".',
  },
  goodbye: {
    group: 'non-domain',
    description: 'Ends the conversation, e.g. "bye", "see you later", "that is all".',
  },
  'out-of-scope': {
    group: 'non-domain',
    description:
      'A request unrelated to the app, e.g. jokes, poems, trivia, coding help, weather, politics.',
  },
  read_balances: {
    group: 'read',
    description: 'Asks for account balances, total fund, actual cash, health, growth, allowance, or trend.',
  },
  read_expenses: {
    group: 'read',
    description: 'Asks for expenses, monthly total, or expenses due before next payday.',
  },
  read_wishlist: {
    group: 'read',
    description: 'Asks for wishlist items, pending total, or next items by priority.',
  },
  read_record_logs: {
    group: 'read',
    description: 'Asks to view record logs or audit logs of financial events.',
  },
  read_reminders: {
    group: 'read',
    description: 'Asks to view reminders, debts owed, or expected payments.',
  },
  read_profile: {
    group: 'read',
    description: 'Asks to view profile settings, base salary, or employment status.',
  },
  update_base_salary: {
    group: 'write',
    description: 'Requests to update base salary or employment status.',
  },
  manage_account_entry: {
    group: 'write',
    description: 'Requests to create, rename, or delete account entries.',
  },
  manage_entry_record: {
    group: 'write',
    description: 'Requests to save, update, or delete daily balance records.',
  },
  manage_expense: {
    group: 'write',
    description: 'Requests to create, edit, or delete an expense.',
  },
  manage_wishlist: {
    group: 'write',
    description: 'Requests to create, edit, delete, or mark purchased a wishlist item.',
  },
  swap_wishlist_priority: {
    group: 'write',
    description: 'Requests to swap priority levels between wishlist items.',
  },
  manage_reminder: {
    group: 'write',
    description: 'Requests to create, edit, complete, or delete a reminder.',
  },
  manage_memory: {
    group: 'write',
    description: 'Requests to save or forget agent memory/preferences.',
  },
  check_affordability: {
    group: 'analysis',
    description: 'Asks if an item or amount can be afforded now or next month.',
  },
  check_spending_range: {
    group: 'analysis',
    description: 'Asks if spending a certain amount over a few days is safe, or what the safe range is.',
  },
  estimate_when_available: {
    group: 'analysis',
    description: 'Asks when an amount will be available or when a goal can be reached.',
  },
  spending_review: {
    group: 'analysis',
    description: 'Asks for a spending review or help reducing spending ("am I spending too much?").',
  },
  what_if_analysis: {
    group: 'analysis',
    description: 'Asks what-if questions, e.g. how a new expense changes the allowance.',
  },
};
