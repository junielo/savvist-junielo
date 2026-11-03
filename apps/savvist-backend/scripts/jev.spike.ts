import { TypeSafeClassifier } from '@langchain/typesafe';

const classifier = new TypeSafeClassifier({
  dangerouslyAllowBrowser: false,
  questions: {
    is_confirmation: {
      type: 'noul',
      instructions: 'Is the user agreeing to or confirming a proposed action?',
    },
    group: {
      type: 'choice',
      instructions: 'Which kind of request is this?',
      criteria: {
        control: 'Replies to the assistant: yes, no, cancel, corrections.',
        chat: 'Greetings, thanks, or questions about the assistant.',
        read: 'Asking to see balances, metrics, expenses, wishlist, or logs.',
        write: 'Asking to change data, or reporting spending.',
        analysis: 'Affordability, what-if, or advice questions.',
      },
    },
  },
});

const messages = [
  'Yes',
  'I spent 200 on coffee',
  "What's my Actual Cash?",
  "I won't need this anymore",
];

async function main() {
  for (const state of messages) {
    const response = await classifier.invoke(state);
    console.log(state, JSON.stringify(response.answers, null, 2));
  }
}
main();