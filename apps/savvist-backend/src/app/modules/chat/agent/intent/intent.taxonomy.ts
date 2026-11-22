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
    description:
      'Asks for account balances, accounts records, balance entries, total fund, actual cash, health, growth, allowance, trend, or whether account balances/entries have been input or recorded for today or a specific date. Only viewing or checking balance status. Not saving or recording a balance (manage_entry_record).',
  },
  read_expenses: {
    group: 'read',
    description:
      'Asks to see recurring expenses or scheduled bills the user pays out (such as rent, electricity, utilities, subscriptions), including amounts, totals, and due or scheduled dates, e.g. "what are my expenses", "how much is [bill]", "when is [bill] due", "what is due before payday". Only viewing recurring expenses and bills. Not purchases, bought items, or pending items (read_wishlist). Not money owed to the user (read_reminders), not adding or changing an expense (manage_expense).',
  },
  read_wishlist: {
    group: 'read',
    description:
      'Asks to view, list, query, or count wishlist items, purchases, bought items, or pending items, including pending items, already purchased or bought items, purchase history, most expensive or cheapest purchase, totals, breakdown by month, or items by priority, e.g. "what is on my wishlist", "what is my most expensive purchase", "show bought items", "how many items did I already purchase", "show purchased items", "pending items", "what should I buy next". Not recurring bills or scheduled expenses (read_expenses). Only viewing and querying records. Not adding, deleting, editing, or marking an item as purchased (manage_wishlist).',
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
  search_products: {
    group: 'read',
    description:
      'Asks to search the web for products, consumer items, gear, or merchandise to buy, including options within a price range, budget constraints, or specifications, e.g. "show me keyboard with a price of 2000 to 4000", "find running shoes under 5000", "what is the best keyboard worth 3000 pesos", "search online for budget noise cancelling headphones". Only searching for products/items to buy on the web. Not viewing saved wishlist items or past purchases (read_wishlist). Not general web trivia, news, or general knowledge (out-of-scope).',
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
    description:
      'Requests to save, update, or delete daily balance records. An action that changes data. Not asking or checking whether balances were already entered or input (read_balances).',
  },
  manage_expense: {
    group: 'write',
    description:
      'Requests to create, edit, or delete a recurring expense or bill. An action that changes recurring expense data. Not adding, buying, or purchasing wishlist items (manage_wishlist).',
  },
  manage_wishlist: {
    group: 'write',
    description:
      'Requests to create, edit, delete, or change the status of a wishlist item, purchase, bought item, or pending item, such as marking an item as bought or purchased, e.g. "add shoes to wishlist", "I bought the watch, mark it purchased", "delete pending item". An action that changes data. Not recurring expenses or bills (manage_expense). Not asking about, viewing, or counting already purchased or pending items (read_wishlist).',
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
