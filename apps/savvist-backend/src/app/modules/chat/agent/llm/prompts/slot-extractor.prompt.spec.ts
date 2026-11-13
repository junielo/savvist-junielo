import { buildSlotExtractorPrompt } from './slot-extractor.prompt';

describe('buildSlotExtractorPrompt', () => {
  it('builds a dynamic prompt for read_wishlist without biased hardcoded query examples', () => {
    const prompt = buildSlotExtractorPrompt({
      message: 'Show cheapest wishlist item',
      historyText: 'none',
      intent: 'read_wishlist',
    });

    expect(prompt).toContain('Extract wishlist query arguments and a standalone query');
    expect(prompt).toContain('Standalone Query:');
    // Ensure biased hardcoded user examples are not present
    expect(prompt).not.toContain('what about my expenses?');
    expect(prompt).not.toContain('how much was that?');
    expect(prompt).not.toContain('how much is that?');
  });

  it('builds a dynamic prompt for non-wishlist intents with dynamic limit and extreme rules', () => {
    const prompt = buildSlotExtractorPrompt({
      message: 'what about my expenses?',
      historyText: 'User: "What is my most expensive wishlist item?"\nAssistant: "Qatar Budget"',
      intent: 'read_expenses',
    });

    expect(prompt).toContain('Extract slots and a standalone query');
    expect(prompt).toContain('single extreme (such as most/least expensive, highest/lowest amount');
    expect(prompt).toContain('Standalone Query:');
    // Ensure biased hardcoded user examples are not present
    expect(prompt).not.toContain('(e.g. "what about my expenses?"');
    expect(prompt).toContain('Recent conversation history (last 3 turns):');
    expect(prompt).toContain('What is my most expensive wishlist item?');
  });
});
