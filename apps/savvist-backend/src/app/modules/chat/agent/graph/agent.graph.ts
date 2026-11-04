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
import { extractSlotsNode } from './nodes/extract-slots.node';
import { clarifyNode } from './nodes/clarify.node';
import { capabilityCheckNode } from './nodes/capability-check.node';
import { blockedNode } from './nodes/blocked.node';
import { readDataNode } from './nodes/read-data.node';
import { analyzeNode } from './nodes/analyze.node';
import { prepareActionNode } from './nodes/prepare-action.node';
import { confirmFirstNode } from './nodes/confirm-first.node';
import { resolveConfirmationNode } from './nodes/resolve-confirmation.node';
import { executeWriteNode } from './nodes/execute-write.node';
import { respondNode } from './nodes/respond.node';

export interface AgentDeps extends ClassifyIntentDeps {
  loadContext?: LoadContextDeps;
  stateGuard?: StateGuardOptions;
}

export function buildGraph(deps: AgentDeps, checkpointer?: BaseCheckpointSaver) {
  const graph = new StateGraph(AgentState)
    .addNode('load-context', loadContextNode(deps.loadContext))
    .addNode('state-guard', stateGuardNode(deps.stateGuard))
    .addNode('classify-intent', classifyIntentNode(deps))
    .addNode('extract-slots', extractSlotsNode)
    .addNode('clarify', clarifyNode)
    .addNode('capability-check', capabilityCheckNode)
    .addNode('blocked', blockedNode)
    .addNode('read-data', readDataNode)
    .addNode('analyze', analyzeNode)
    .addNode('prepare-action', prepareActionNode)
    .addNode('confirm-first', confirmFirstNode)
    .addNode('resolve-confirmation', resolveConfirmationNode)
    .addNode('execute-write', executeWriteNode)
    .addNode('respond', respondNode)

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
