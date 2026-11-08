import * as fs from 'fs';
import * as path from 'path';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { agentStateToJSON, saveAgentStateLog } from './run-logger';
import { AgentStateType } from '../src/app/modules/chat/agent/graph/agent.state';

describe('RunLogger', () => {
  const testLogsPath = path.join(__dirname, 'test-logs.json');

  afterEach(() => {
    if (fs.existsSync(testLogsPath)) {
      fs.unlinkSync(testLogsPath);
    }
  });

  it('should convert AgentStateType to a JSON object', () => {
    const state: AgentStateType = {
      messages: [new HumanMessage('Hello'), new AIMessage('Hi there')],
      intentResult: { intent: 'greeting', confidence: 0.99 },
      slots: { action: null },
      readResult: null,
      pending_action: null,
      awaiting_clarification: null,
      context: { userId: '123', timeZone: 'UTC', locale: 'en' } as any,
      clarification_turns: 0,
    };

    const jsonObj = agentStateToJSON('testNode', state);

    expect(jsonObj).toBeDefined();
    expect(jsonObj['timestamp']).toBeDefined();
    expect(jsonObj['messages']).toHaveLength(2);
    expect(jsonObj['messages'][0]).toMatchObject({
      type: 'human',
      content: 'Hello',
    });
    expect(jsonObj['messages'][1]).toMatchObject({
      type: 'ai',
      content: 'Hi there',
    });
    expect(jsonObj['intentResult']).toEqual({ intent: 'greeting', confidence: 0.99 });
    expect(jsonObj['clarification_turns']).toBe(0);
  });

  it('should append multiple AgentStateType records as an array to logs.json', () => {
    const state1: AgentStateType = {
      messages: [new HumanMessage('First run')],
      intentResult: { intent: 'intent_1' },
      slots: {},
      readResult: null,
      pending_action: null,
      awaiting_clarification: null,
      context: null,
      clarification_turns: 0,
    };

    const state2: AgentStateType = {
      messages: [new HumanMessage('Second run')],
      intentResult: { intent: 'intent_2' },
      slots: {},
      readResult: null,
      pending_action: null,
      awaiting_clarification: null,
      context: null,
      clarification_turns: 0,
    };

    saveAgentStateLog('node1', state1, testLogsPath);
    saveAgentStateLog('node2', state2, testLogsPath);

    expect(fs.existsSync(testLogsPath)).toBe(true);

    const fileContent = fs.readFileSync(testLogsPath, 'utf-8');
    const parsed = JSON.parse(fileContent);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]['messages'][0].content).toBe('First run');
    expect(parsed[0]['intentResult']).toEqual({ intent: 'intent_1' });
    expect(parsed[1]['messages'][0].content).toBe('Second run');
    expect(parsed[1]['intentResult']).toEqual({ intent: 'intent_2' });
  });
});
