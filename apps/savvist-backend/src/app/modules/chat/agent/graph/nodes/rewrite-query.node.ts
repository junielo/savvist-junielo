/* eslint-disable @typescript-eslint/no-explicit-any */
import { HumanMessage } from '@langchain/core/messages';
import { AgentStateType } from '../agent.state';
import { QueryRewriter } from '../../llm/query-rewriter';
import { HistoryMessage } from '../../llm/slot-extractor';
import { ObservabilityService } from '../../observability/observability.service';

export interface RewriteQueryDeps {
  queryRewriter?: QueryRewriter;
  observability?: ObservabilityService;
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((c: any) => (typeof c === 'string' ? c : c?.text ?? '')).join(' ');
  }
  return String(content ?? '');
}

export const rewriteQueryNodeFactory = (deps: RewriteQueryDeps | QueryRewriter = {}) => {
  const queryRewriter = deps instanceof QueryRewriter ? deps : deps.queryRewriter;
  const observability = deps instanceof QueryRewriter ? undefined : deps.observability;

  return async function rewriteQueryNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    observability?.SetExecutedNode('rewrite-query');
    const all = state.messages;
    const lastUserIndex = all.map((m) => HumanMessage.isInstance(m)).lastIndexOf(true);
    const lastUserMessage = lastUserIndex >= 0 ? textOf(all[lastUserIndex].content) : '';

    const historySlice = lastUserIndex >= 0 ? all.slice(0, lastUserIndex) : all.slice(0, -1);
    const recentHistory: HistoryMessage[] = historySlice
      .slice(-6)
      .map((m) => ({
        role: HumanMessage.isInstance(m) ? ('user' as const) : ('assistant' as const),
        text: textOf(m.content),
      }))
      .filter((h) => h.text.trim().length > 0);

    if (!queryRewriter || recentHistory.length === 0) {
      return { rewrittenQuery: lastUserMessage };
    }

    const rewrittenQuery = await queryRewriter.rewrite(lastUserMessage, recentHistory);
    return { rewrittenQuery: rewrittenQuery || lastUserMessage };
  };
};

export const rewriteQueryNode = rewriteQueryNodeFactory();
