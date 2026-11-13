/* eslint-disable @typescript-eslint/no-explicit-any */
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { TurnContext } from './turn-context';

const lastWrite = <T>(initial: T) =>
  Annotation<T>({ reducer: (_prev, next) => next, default: () => initial });

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer, default: () => [] }),
  intentResult: lastWrite<any | null>(null),
  slots: lastWrite<any | null>(null),
  readResult: lastWrite<any | null>(null),
  pending_action: lastWrite<any | null>(null),
  awaiting_clarification: lastWrite<string | null>(null),
  context: lastWrite<TurnContext | null>(null),
  clarification_turns: lastWrite<number>(0),
  rewrittenQuery: lastWrite<string | null>(null),
  toolMessages: Annotation<BaseMessage[], BaseMessage[] | 'reset'>({
    reducer: (left, right) => (right === 'reset' ? [] : left.concat(right)),
    default: () => [],
  }),
  toolSteps: Annotation<number>({ reducer: (_l, r) => r, default: () => 0 }),
  toolAnswer: Annotation<string | null>({ reducer: (_l, r) => r, default: () => null }),
});

export type AgentStateType = typeof AgentState.State;