import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

const lastWrite = <T>(initial: T) =>
  Annotation<T>({ reducer: (_prev, next) => next, default: () => initial });

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer, default: () => [] }),
  intentResult: lastWrite<any | null>(null),
  slots: lastWrite<any | null>(null),
  pending_action: lastWrite<any | null>(null),
  awaiting_clarification: lastWrite<string | null>(null),
});

export type AgentStateType = typeof AgentState.State;
