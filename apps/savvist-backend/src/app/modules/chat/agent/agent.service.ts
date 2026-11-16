import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import { buildGraph } from './graph/agent.graph';
import type { IntentClassifierPort } from './graph/nodes/classify-intent.node';
import { INTENT_CLASSIFIER } from './intent/intent-classifier.token';
import { CHECKPOINTER } from './persistence/mongo-checkpointer.provider';
import { QueryRewriter } from './llm/query-rewriter';
import { SlotExtractor } from './llm/slot-extractor';
import { ReadTool } from './tools/read.tool';
import { WriteTool } from './tools/write.tool';
import { ReplyWriter } from './llm/reply-writer';
import { CapabilityCheckService } from './capabilities/capability-check.service';
import { ObservabilityService } from './observability/observability.service';

export interface AgentReply {
  reply: string;
  intent: string | null;
}

@Injectable()
export class AgentService {
  private readonly graph: ReturnType<typeof buildGraph>;
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(
    private readonly observeService: ObservabilityService,
    @Inject(INTENT_CLASSIFIER) classifier: IntentClassifierPort,
    @Inject(CHECKPOINTER) checkpointer: BaseCheckpointSaver,
    queryRewriter: QueryRewriter,
    slotExtractor: SlotExtractor,
    readTool: ReadTool,
    writeTool: WriteTool,
    replyWriter: ReplyWriter,
    capabilityCheck: CapabilityCheckService,
    config: ConfigService,
  ) {
    this.graph = buildGraph(
      {
        classifier,
        queryRewriter,
        slotExtractor,
        readTool,
        writeTool,
        replyWriter,
        capabilityService: capabilityCheck,
        observability: this.observeService,
        loadContext: {
          defaultTimeZone: config.get<string>('AGENT_DEFAULT_TIMEZONE', 'Asia/Manila'),
          defaultLocale: config.get<string>('AGENT_DEFAULT_LOCALE', 'en'),
          observability: this.observeService,
        },
        stateGuard: {
          maxClarificationTurns: config.get<number>('AGENT_MAX_CLARIFY_TURNS', 2),
          observability: this.observeService,
        },
      },
      checkpointer,
    );
  }

  async run(p: { userId: string; conversationId: string; text: string }): Promise<AgentReply> {
    this.observeService.reset();
    this.observeService.setUserMessage(p.text);
    return this.serialize(p.conversationId, async () => {
      const config = { configurable: { thread_id: p.conversationId, userId: p.userId } };
      let input: unknown = { messages: [new HumanMessage(p.text)] };

      try {
        const snapshot = await this.graph.getState(config);
        const tasks = (snapshot as any)?.tasks ?? [];
        const next = (snapshot as any)?.next ?? [];
        const isPaused =
          tasks.some((t: any) => t.interrupts && t.interrupts.length > 0) ||
          next.includes('confirm-first');

        if (isPaused) {
          input = new Command({ resume: p.text });
        }
      } catch {
        // If getState fails (e.g. no prior checkpoints or in-memory runner), proceed with fresh HumanMessage
      }

      const result = await this.graph.invoke(input as any, config);
      const reply = this.replyFrom(result.messages);
      this.observeService.setResponse(reply);
      return {
        reply,
        intent: result.intentResult?.intent ?? null,
      };
    });
  }

  private replyFrom(messages: unknown[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (AIMessage.isInstance(m) && typeof m.content === 'string' && m.content) {
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
