import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import { buildGraph } from './graph/agent.graph';
import type { IntentClassifierPort } from './graph/nodes/classify-intent.node';
import { INTENT_CLASSIFIER } from './intent/intent-classifier.token';
import { CHECKPOINTER } from './persistence/mongo-checkpointer.provider';

export interface AgentReply {
  reply: string;
  intent: string | null;
}

@Injectable()
export class AgentService {
  private readonly graph: ReturnType<typeof buildGraph>;
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(
    @Inject(INTENT_CLASSIFIER) classifier: IntentClassifierPort,
    @Inject(CHECKPOINTER) checkpointer: BaseCheckpointSaver,
    config: ConfigService,
  ) {
    this.graph = buildGraph(
      {
        classifier,
        loadContext: {
          defaultTimeZone: config.get<string>('AGENT_DEFAULT_TIMEZONE', 'Asia/Manila'),
          defaultLocale: config.get<string>('AGENT_DEFAULT_LOCALE', 'en'),
        },
        stateGuard: {
          maxClarificationTurns: config.get<number>('AGENT_MAX_CLARIFY_TURNS', 2),
        },
      },
      checkpointer,
    );
  }

  async run(p: { userId: string; conversationId: string; text: string }): Promise<AgentReply> {
    return this.serialize(p.conversationId, async () => {
      const result = await this.graph.invoke(
        { messages: [new HumanMessage(p.text)] },   // HumanMessage is used here
        { configurable: { thread_id: p.conversationId, userId: p.userId } },
      );
      return {
        reply: this.replyFrom(result.messages),
        intent: result.intentResult?.intent ?? null,
      };
    });
  }

  private replyFrom(messages: unknown[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (AIMessage.isInstance(m) && typeof m.content === 'string' && m.content) {   // AIMessage is used here
        return m.content;
      }
    }
    throw new Error('Graph produced no assistant reply');
  }

  private serialize<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.queues.get(key) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(fn);
    this.queues.set(key, next);
    void next.finally(() => {
      if (this.queues.get(key) === next) this.queues.delete(key);
    }).catch(() => undefined);
    return next;
  }
}