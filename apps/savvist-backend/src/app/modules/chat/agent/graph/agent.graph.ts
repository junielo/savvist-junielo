import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import { AgentState } from './agent.state';
import {
  routeAfterGuard,
  routeAfterClassify,
  routeAfterSlots,
  routeAfterCapability,
  routeAfterResolve,
  routeAfterExec,
} from './agent.routers';
import { LoadContextDeps, loadContextNode } from './nodes/load-context.node';
import { stateGuardNode, StateGuardOptions } from './nodes/state-guard.node';
import { classifyIntentNode, type ClassifyIntentDeps } from './nodes/classify-intent.node';
import { rewriteQueryNodeFactory } from './nodes/rewrite-query.node';
import { extractSlotsNodeFactory } from './nodes/extract-slots.node';
import { clarifyNodeFactory } from './nodes/clarify.node';
import { capabilityCheckNodeFactory } from './nodes/capability-check.node';
import { blockedNodeFactory } from './nodes/blocked.node';
import { readDataNodeFactory } from './nodes/read-data.node';
import { analyzeNode } from './nodes/analyze.node';
import { prepareActionNodeFactory } from './nodes/prepare-action.node';
import { confirmFirstNodeFactory } from './nodes/confirm-first.node';
import { resolveConfirmationNodeFactory } from './nodes/resolve-confirmation.node';
import { executeWriteNodeFactory } from './nodes/execute-write.node';
import { respondNodeFactory } from './nodes/respond.node';
import { QueryRewriter } from '../llm/query-rewriter';
import { SlotExtractor } from '../llm/slot-extractor';
import { ReadTool } from '../tools/read.tool';
import { ProductSearchService } from '../tools/product-search.service';
import { WriteTool } from '../tools/write.tool';
import { ReplyWriter } from '../llm/reply-writer';
import { CapabilityCheckService } from '../capabilities/capability-check.service';
import { ObservabilityService } from '../observability/observability.service';
import { JevClient } from '../intent/classifiers/jev.client';

export interface AgentDeps extends ClassifyIntentDeps {
  loadContext?: LoadContextDeps;
  stateGuard?: StateGuardOptions;
  queryRewriter?: QueryRewriter;
  slotExtractor?: SlotExtractor;
  readTool?: ReadTool;
  productSearchService?: ProductSearchService;
  writeTool?: WriteTool;
  replyWriter?: ReplyWriter;
  observability?: ObservabilityService;
  capabilityService?: CapabilityCheckService;
  jevClient?: JevClient;
}

export function buildGraph(deps: AgentDeps, checkpointer?: BaseCheckpointSaver) {
  const graph = new StateGraph(AgentState)
    .addNode('load-context', loadContextNode(deps.loadContext))
    .addNode('state-guard', stateGuardNode(deps.stateGuard))
    .addNode('classify-intent', classifyIntentNode(deps))
    .addNode('rewrite-query', rewriteQueryNodeFactory({ queryRewriter: deps.queryRewriter, observability: deps.observability }))
    .addNode('extract-slots', extractSlotsNodeFactory({ slotExtractor: deps.slotExtractor, observability: deps.observability }))
    .addNode('clarify', clarifyNodeFactory({ observability: deps.observability }))
    .addNode('capability-check', capabilityCheckNodeFactory({ capabilityService: deps.capabilityService, observability: deps.observability }))
    .addNode('blocked', blockedNodeFactory({ observability: deps.observability }))
    .addNode(
      'read-data',
      readDataNodeFactory({
        readTool: deps.readTool,
        productSearchService: deps.productSearchService,
        observability: deps.observability,
      }),
    )
    .addNode('analyze', analyzeNode)
    .addNode('prepare-action', prepareActionNodeFactory({ observability: deps.observability, writeTool: deps.writeTool }))
    .addNode('confirm-first', confirmFirstNodeFactory({ observability: deps.observability }))
    .addNode('resolve-confirmation', resolveConfirmationNodeFactory({ observability: deps.observability, jevClient: deps.jevClient }))
    .addNode('execute-write', executeWriteNodeFactory({ writeTool: deps.writeTool, observability: deps.observability }))
    .addNode('respond', respondNodeFactory({ replyWriter: deps.replyWriter, observability: deps.observability }))

    .addEdge(START, 'load-context')
    .addEdge('load-context', 'state-guard')
    .addConditionalEdges('state-guard', routeAfterGuard, {
      'extract-slots': 'extract-slots',
      'classify-intent': 'classify-intent',
    })
    .addConditionalEdges('classify-intent', routeAfterClassify, {
      respond: 'respond',
      clarify: 'clarify',
      'rewrite-query': 'rewrite-query',
      'extract-slots': 'extract-slots',
    })
    .addEdge('rewrite-query', 'extract-slots')
    .addConditionalEdges('extract-slots', routeAfterSlots, {
      clarify: 'clarify',
      'capability-check': 'capability-check',
    })
    .addConditionalEdges('capability-check', routeAfterCapability, {
      blocked: 'blocked',
      'read-data': 'read-data',
      analyze: 'analyze',
      'prepare-action': 'prepare-action',
    })
    .addEdge('prepare-action', 'confirm-first')
    .addEdge('confirm-first', 'resolve-confirmation')
    .addConditionalEdges('resolve-confirmation', routeAfterResolve, {
      'execute-write': 'execute-write',
      respond: 'respond',
      'extract-slots': 'extract-slots',
      'classify-intent': 'classify-intent',
    })
    .addConditionalEdges('execute-write', routeAfterExec, {
      'prepare-action': 'prepare-action',
      respond: 'respond',
    })
    .addEdge('read-data', 'respond')
    .addEdge('analyze', 'respond')
    .addEdge('blocked', 'respond')
    .addEdge('clarify', 'respond')
    .addEdge('respond', END);

  return checkpointer ? graph.compile({ checkpointer }) : graph.compile();
}