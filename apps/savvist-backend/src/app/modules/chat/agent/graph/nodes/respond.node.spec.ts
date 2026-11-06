import { respondNode } from './respond.node';
import { AgentStateType } from '../agent.state';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

describe('respondNode', () => {
  const baseState: AgentStateType = {
    messages: [new HumanMessage('Hello')],
    intentResult: null,
    slots: null,
    pending_action: null,
    awaiting_clarification: null,
    context: {
      userId: 'user-1',
      locale: 'en',
      timeZone: 'Asia/Manila',
      today: '2026-03-30',
      nowIso: '2026-03-30T00:00:00.000Z',
    },
    clarification_turns: 0,
  };

  it('should generate clarification response when intent is unknown or null', async () => {
    const result = await respondNode(baseState);
    expect(result.messages).toBeDefined();
    expect(result.messages?.[0]).toBeInstanceOf(AIMessage);
    expect((result.messages?.[0] as AIMessage).content).toContain("I'm not quite sure I caught that");
  });

  it('should include due reminders on new conversation if count > 0', async () => {
    const stateWithReminders: AgentStateType = {
      ...baseState,
      intentResult: {
        intent: 'greeting',
        group: 'non-domain',
        confidence: 0.99,
        runnerUp: null,
        probabilities: {},
        source: 'jev',
      },
      context: {
        ...baseState.context!,
        dueReminderCount: 2,
      },
    };
    const result = await respondNode(stateWithReminders);
    expect((result.messages?.[0] as AIMessage).content).toContain('You have 2 due reminder(s)');
  });

  it('should include estimate note for analysis intents', async () => {
    const analysisState: AgentStateType = {
      ...baseState,
      intentResult: {
        intent: 'check_affordability',
        group: 'analysis',
        confidence: 0.95,
        runnerUp: null,
        probabilities: {},
        source: 'jev',
      },
    };
    const result = await respondNode(analysisState);
    expect((result.messages?.[0] as AIMessage).content).toContain('estimate based on your recorded entries');
  });

  it('should handle blocked or unsupported feature intents', async () => {
    const blockedState: AgentStateType = {
      ...baseState,
      intentResult: {
        intent: 'unsupported_feature',
        group: 'unknown',
        confidence: 0.99,
        runnerUp: null,
        probabilities: {},
        source: 'guard',
        capabilityCheck: { blocked: true, reason: 'This request falls outside my scope.' },
      },
    };
    const result = await respondNode(blockedState);
    expect((result.messages?.[0] as AIMessage).content).toContain('falls outside my scope');
  });
});
