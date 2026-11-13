import { buildStandaloneQueryPrompt } from './standalone-query.prompt';

describe('buildStandaloneQueryPrompt', () => {
  it('builds a standalone query prompt with history and follow-up rules', () => {
    const prompt = buildStandaloneQueryPrompt({
      message: 'what about my expenses?',
      historyText: 'User: "What is my most expensive wishlist item?"\nAssistant: "Qatar Budget"',
    });

    expect(prompt).toContain('You are a conversational query rewriter');
    expect(prompt).toContain('Carry forward any active context, predicates, superlatives');
    expect(prompt).toContain('what about my expenses?');
    expect(prompt).toContain('Qatar Budget');
  });
});
