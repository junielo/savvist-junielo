import { HumanMessage } from '@langchain/core/messages';
import { classifyIntentNode, type IntentClassifierPort } from './classify-intent.node';
import type { AgentStateType } from '../agent.state';
import type { IntentResult } from '../../intent/intent.types';

describe('classifyIntentNode', () => {
  const mockClassifier = (result: IntentResult): IntentClassifierPort => ({
    classify: jest.fn().mockResolvedValue(result),
  });

  const mockState = (messages: any[] = []): AgentStateType =>
    ({
      messages,
      intentResult: null,
      slots: null,
      readResult: null,
      writeResult: null,
      pending_action: null,
      awaiting_clarification: null,
      context: null,
      clarification_turns: 0,
      rewrittenQuery: null,
      toolMessages: [],
      toolSteps: 0,
      toolAnswer: null,
      queued_queries: [],
    } as any);

  it('classifies normal query using the classifier port', async () => {
    const rawResult: IntentResult = {
      intent: 'read_expenses',
      group: 'read',
      confidence: 0.85,
      runnerUp: null,
      probabilities: { read_expenses: 0.85 },
      source: 'jev',
    };
    const classifier = mockClassifier(rawResult);
    const node = classifyIntentNode({ classifier });

    const state = mockState([new HumanMessage('how much is my condo rent?')]);
    const update = await node(state);

    expect(classifier.classify).toHaveBeenCalledWith({
      message: 'how much is my condo rent?',
      previousAssistantMessage: undefined,
    });
    expect(update.intentResult?.intent).toBe('read_expenses');
    expect(update.intentResult?.group).toBe('read');
  });

  it('returns unknown when there is no user message', async () => {
    const classifier = mockClassifier({} as any);
    const node = classifyIntentNode({ classifier });

    const state = mockState([]);
    const update = await node(state);

    expect(classifier.classify).not.toHaveBeenCalled();
    expect(update.intentResult?.intent).toBe('unknown');
    expect(update.intentResult?.group).toBe('unknown');
    expect(update.intentResult?.source).toBe('guard');
  });
});
