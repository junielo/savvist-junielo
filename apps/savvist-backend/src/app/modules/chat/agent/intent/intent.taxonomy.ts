import type { IntentGroup, JevIntentName } from './intent.types';

interface IntentDef {
  group: IntentGroup;
  description: string; // sent to Jev
}

export const INTENTS: Record<JevIntentName, IntentDef> = {
  greeting: { // Implemented
    group: 'non-domain',
    description:
      'A hello or social opener with no request, e.g. "hi", "hello", "good morning", "hey there".',
  },
  'about-assistant': { // Implemented
    group: 'non-domain',
    description:
      'Asks what or who the assistant is, e.g. "what are you", "are you a bot", "what is Savvist AI". Not about features and not about who built it.',
  },
  capabilities: { // Implemented
    group: 'non-domain',
    description:
      'Asks what the assistant can do or help with, e.g. "what can you do", "how can you help me", "what features do you have".',
  },
  purpose: { // Implemented
    group: 'non-domain',
    description:
      'Asks why the assistant exists or what its purpose is, e.g. "what is your purpose", "why were you made". Not a request for a feature list.',
  },
  creator: { // Implemented
    group: 'non-domain',
    description:
      'Asks who built, made, trained or owns the assistant, e.g. "who made you", "who created you", "which company are you from".',
  },
  thanks: { // Implemented
    group: 'non-domain',
    description: 'Expresses thanks or appreciation, e.g. "thanks", "thank you so much".',
  },
  goodbye: { // Implemented
    group: 'non-domain',
    description: 'Ends the conversation, e.g. "bye", "see you later", "that is all".',
  },
  'out-of-scope': { // Implemented
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
    description: 'Asks to see expenses or bills the user pays out, including amounts, totals, and due or scheduled dates, e.g. "what are my expenses", "how much is [bill]", "when is [bill] due", "what is due before payday". Only viewing. Not money owed to the user (read_reminders), not adding or changing an expense (manage_expense).',
  },
  read_wishlist: {
    group: 'read',
    description:
      'Asks to view, list, or count wishlist items, including pending items, already purchased or bought items, totals, or items by priority, e.g. "what is on my wishlist", "how many items did I already purchase", "show purchased items", "what should I buy next". Only viewing and querying records. Not adding, deleting, editing, or marking an item as purchased (manage_wishlist).',
  },
  read_record_logs: {
    group: 'read',
    description: 'Asks to view record logs or audit logs of financial events.',
  },
  read_profile: {
    group: 'read',
    description: 'Asks to view profile settings, base salary, or employment status.',
  },
  read_reminders: {
    group: 'read',
    description: 'Asks to see reminders, money other people owe the user, or payments the user expects to receive, e.g. "what reminders do I have", "who owes me money", "when is [person] paying me back". Not bills or expenses the user has to pay (read_expenses).',
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
    description:
      'Requests to create, edit, delete, or change the status of a wishlist item, such as marking an item as bought or purchased, e.g. "add shoes to wishlist", "I bought the watch, mark it purchased", "delete item". An action that changes data. Not asking about, viewing, or counting already purchased items (read_wishlist).',
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
