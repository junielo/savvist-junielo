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
};