/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { JevClient, type ConfirmationResolutionResult } from './intent/classifiers/jev.client';

export interface AgentReply {
  reply: string;
  intent: string | null;
}

@Injectable()
export class AgentService {
  private readonly graph: ReturnType<typeof buildGraph>;
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly queryRewriter: QueryRewriter;

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
    private readonly jevClient?: JevClient,
  ) {
    this.queryRewriter = queryRewriter;
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
        jevClient: this.jevClient,
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
          // 1. Evaluate user confirmation intent using Jev
          let confirmationRes: ConfirmationResolutionResult | null = null;
          const pendingAction = (snapshot as any)?.values?.pending_action;
          const actionDesc = pendingAction?.description;

          if (this.jevClient) {
            try {
              confirmationRes = await this.jevClient.resolveConfirmationResponse(p.text, actionDesc);
            } catch {
              // fallback
            }
          }

          const isConfirm = confirmationRes?.resolution === 'confirm';
          const isDeny = !isConfirm && confirmationRes?.resolution === 'deny';

          // 2. If user confirmed or denied, process write + any deferred/secondary queries
          if (isConfirm || isDeny) {
            const previousQueued = ((snapshot as any)?.values?.queued_queries as string[]) || [];
            const queue = [...previousQueued];

            if (confirmationRes?.hasSecondaryRequest) {
              const secondaryQuery = await this.queryRewriter.extractSecondaryQuery(p.text);
              if (secondaryQuery && secondaryQuery.trim().length > 0) {
                queue.push(secondaryQuery.trim());
              }
            }

            // Step 1: Resume the graph with confirmation or denial ('yes' or 'no')
            const step1Action = isConfirm ? 'yes' : 'no';
            const step1Input = new Command({ resume: step1Action });
            const step1Result = await this.graph.invoke(step1Input as any, config);
            const step1Reply = this.replyFrom(step1Result.messages);

            // Circuit breaker: If step 1 failed or triggered conflict, return step 1 immediately
            const step1Conflict = Boolean(step1Result.pending_action?.conflict);
            const step1Error = step1Result.writeResult?.success === false;

            if (step1Conflict || step1Error || queue.length === 0) {
              this.observeService.setResponse(step1Reply);
              return {
                reply: step1Reply,
                intent: step1Result.intentResult?.intent ?? null,
              };
            }

            // Step 2: Parallel execution of all queued queries
            let lastQueueIntent: string | null = null;
            const queueReplies = await Promise.all(
              queue.map(async (query) => {
                const res = await this.graph.invoke(
                  { messages: [new HumanMessage(query)], queued_queries: [] },
                  config,
                );
                if (res.intentResult?.intent) {
                  lastQueueIntent = res.intentResult.intent;
                }
                return this.replyFrom(res.messages);
              }),
            );

            const combinedReply = [step1Reply, ...queueReplies].filter(Boolean).join('\n\n');
            this.observeService.setResponse(combinedReply);

            return {
              reply: combinedReply,
              intent: lastQueueIntent ?? step1Result.intentResult?.intent ?? null,
            };
          }

          input = new Command({ resume: p.text });
        } else {
          // Thread is not paused: check for compound multi-intent prompt
          const splitQueries = await this.queryRewriter.splitCompoundQueries(p.text);

          if (splitQueries.length > 1) {
            const firstQuery = splitQueries[0];
            const remainingQueries = splitQueries.slice(1);

            // Run first query with remaining queries queued in state
            const firstResult = await this.graph.invoke(
              { messages: [new HumanMessage(firstQuery)], queued_queries: remainingQueries },
              config,
            );

            // Check if first query paused at confirmation (e.g. prepared an action)
            const tasksAfter =
              ((await this.graph.getState(config).catch(() => null)) as any)?.tasks ?? [];
            const isPausedNow =
              tasksAfter.some((t: any) => t.interrupts && t.interrupts.length > 0) ||
              Boolean(firstResult.pending_action);

            if (isPausedNow) {
              const reply = this.replyFrom(firstResult.messages);
              this.observeService.setResponse(reply);
              return {
                reply,
                intent: firstResult.intentResult?.intent ?? null,
              };
            }

            // If first query was read/non-write, execute remaining queries in parallel
            const remainingReplies = await Promise.all(
              remainingQueries.map(async (q) => {
                const res = await this.graph.invoke(
                  { messages: [new HumanMessage(q)], queued_queries: [] },
                  config,
                );
                return this.replyFrom(res.messages);
              }),
            );

            const allReplies = [this.replyFrom(firstResult.messages), ...remainingReplies];
            const combinedReply = allReplies.filter(Boolean).join('\n\n');
            this.observeService.setResponse(combinedReply);

            return {
              reply: combinedReply,
              intent: firstResult.intentResult?.intent ?? null,
            };
          }
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
