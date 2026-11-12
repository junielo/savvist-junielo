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
  routeAfterToolAgent,
} from './agent.routers';
import { LoadContextDeps, loadContextNode } from './nodes/load-context.node';
import { stateGuardNode, StateGuardOptions } from './nodes/state-guard.node';
import { classifyIntentNode, type ClassifyIntentDeps } from './nodes/classify-intent.node';
import { extractSlotsNodeFactory } from './nodes/extract-slots.node';
import { clarifyNode } from './nodes/clarify.node';
import { capabilityCheckNode } from './nodes/capability-check.node';
import { blockedNode } from './nodes/blocked.node';
import { readDataNodeFactory } from './nodes/read-data.node';
import { analyzeNode } from './nodes/analyze.node';
import { prepareActionNode } from './nodes/prepare-action.node';
import { confirmFirstNode } from './nodes/confirm-first.node';
import { resolveConfirmationNode } from './nodes/resolve-confirmation.node';
import { executeWriteNode } from './nodes/execute-write.node';
import { respondNodeFactory } from './nodes/respond.node';
import {
  toolLoopInitNode,
  toolAgentNodeFactory,
  toolsNodeFactory,
  type ToolLoopDeps,
} from './nodes/tool-loop.nodes';
import { SlotExtractor } from '../llm/slot-extractor';
import { ReadTool } from '../tools/read.tool';
import { ReplyWriter } from '../llm/reply-writer';
import { ObservabilityService } from '../observability/observability.service';

export interface AgentDeps extends ClassifyIntentDeps {
  loadContext?: LoadContextDeps;
  stateGuard?: StateGuardOptions;
  slotExtractor?: SlotExtractor;
  readTool?: ReadTool;
  replyWriter?: ReplyWriter;
  observability?: ObservabilityService;
  toolLoop?: ToolLoopDeps; // { model, dataSource } for the data_question tool loop
}

export function buildGraph(deps: AgentDeps, checkpointer?: BaseCheckpointSaver) {
  const toolLoopDeps = deps.toolLoop ?? {};

  const graph = new StateGraph(AgentState)
    .addNode('load-context', loadContextNode(deps.loadContext))
    .addNode('state-guard', stateGuardNode(deps.stateGuard))
    .addNode('classify-intent', classifyIntentNode(deps))
    .addNode('extract-slots', extractSlotsNodeFactory({ slotExtractor: deps.slotExtractor, observability: deps.observability }))
    .addNode('clarify', clarifyNode)
    .addNode('capability-check', capabilityCheckNode)
    .addNode('blocked', blockedNode)
    .addNode('read-data', readDataNodeFactory({ readTool: deps.readTool, observability: deps.observability }))
    .addNode('analyze', analyzeNode)
    .addNode('tool-loop-init', toolLoopInitNode)
    .addNode('tool-agent', toolAgentNodeFactory(toolLoopDeps))
    .addNode('tool-loop-tools', toolsNodeFactory(toolLoopDeps))
    .addNode('prepare-action', prepareActionNode)
    .addNode('confirm-first', confirmFirstNode)
    .addNode('resolve-confirmation', resolveConfirmationNode)
    .addNode('execute-write', executeWriteNode)
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
      'extract-slots': 'extract-slots',
      'tool-loop-init': 'tool-loop-init',
    })
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
    // Tool loop: model decides -> tools run -> model decides again, until it answers
    .addEdge('tool-loop-init', 'tool-agent')
    .addConditionalEdges('tool-agent', routeAfterToolAgent, {
      'tool-loop-tools': 'tool-loop-tools',
      respond: 'respond',
    })
    .addEdge('tool-loop-tools', 'tool-agent')
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