/* eslint-disable @typescript-eslint/no-explicit-any */
// agent/graph/nodes/tool-loop.nodes.ts
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AgentStateType } from '../agent.state';
import { createDataTools, ToolContext, ToolDataSource } from '../../tools/data-tools';

export const MAX_TOOL_STEPS = 5;
const CONTEXT_MESSAGES = 4; // recent chat turns given to the model (covers follow-ups)

export interface ToolLoopDeps {
  model?: BaseChatModel; // must support bindTools (e.g. ChatGoogleGenerativeAI)
  dataSource?: ToolDataSource;
}

/**
 * ASSUMPTION: adapt to where load-context puts the user id and time zone
 * (turn-context.ts / state). This is the only place that needs to know.
 */
export function toolContextFromState(state: AgentStateType): ToolContext {
  const s = state as unknown as { userId: string; profile?: { timeZone?: string } };
  return { userId: s.userId, timeZone: s.profile?.timeZone ?? 'UTC' };
}

/* ------------------------------------------------------------------ */
/* Prompts                                                             */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You answer questions about the user's own money data using the provided tools.
- Look up data with tools before answering. Never guess, estimate or calculate a figure yourself; only use values returned by tools.
- Use as few tool calls as needed. A call that depends on an earlier result goes in a later step. Independent calls can go together.
- Dates are YYYY-MM-DD.
- If the data needed is missing or the question is ambiguous, say in one sentence what is missing instead of guessing.
- When you have everything, answer briefly in plain language. This is not financial, tax or legal advice.`;

const CAPPED_PROMPT = `${SYSTEM_PROMPT}
You have reached the tool limit. Do not call tools. Answer using only the data already retrieved, and say what is missing if the answer is incomplete.`;

const NUDGE =
  'You have not looked up any data yet. Use the tools to fetch what the question needs before answering, unless the question truly cannot be answered from the user data.';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function textOf(m: BaseMessage): string {
  if (typeof m.content === 'string') return m.content;
  return m.content.map((p) => (p as { text?: string }).text ?? '').join('');
}

const callSignature = (c: { name: string; args: unknown }) => `${c.name}:${JSON.stringify(c.args)}`;

const hasToolResults = (msgs: BaseMessage[]) => msgs.some((m) => m instanceof ToolMessage);

/* ------------------------------------------------------------------ */
/* Nodes                                                               */
/* ------------------------------------------------------------------ */

/** Clears loop state left over from a previous turn (it is checkpointed). */
export const toolLoopInitNode = () => ({
  toolMessages: 'reset' as const,
  toolSteps: 0,
  toolAnswer: null as string | null,
});

/** The model decides: call tools, or answer. */
export function toolAgentNodeFactory(deps: ToolLoopDeps) {
  return async (state: AgentStateType) => {
    if (!deps.model?.bindTools || !deps.dataSource) {
      throw new Error('tool-agent needs a tool-calling model and a dataSource');
    }
    const tools = createDataTools(toolContextFromState(state), deps.dataSource);
    const capped = state.toolSteps >= MAX_TOOL_STEPS;
    // At the cap the model gets no tools, so it has to produce a text answer.
    const model = capped ? deps.model : deps.model.bindTools(tools);

    const base: BaseMessage[] = [
      new SystemMessage(capped ? CAPPED_PROMPT : SYSTEM_PROMPT),
      ...state.messages.slice(-CONTEXT_MESSAGES),
      ...state.toolMessages,
    ];

    let res = (await model.invoke(base)) as AIMessage;

    // Sufficiency guard: a data question answered with no lookup is suspect. Retry once.
    if (!capped && !res.tool_calls?.length && !hasToolResults(state.toolMessages)) {
      res = (await model.invoke([...base, res, new HumanMessage(NUDGE)])) as AIMessage;
    }

    const wantsTools = !!res.tool_calls?.length;
    return {
      toolMessages: [res],
      toolSteps: state.toolSteps + 1,
      toolAnswer: wantsTools ? null : textOf(res),
    };
  };
}

/** Runs the requested tools. The model passes values between calls itself by reading results. */
export function toolsNodeFactory(deps: ToolLoopDeps) {
  return async (state: AgentStateType) => {
    const last = state.toolMessages.at(-1);
    if (!last || !(last instanceof AIMessage) || !deps.dataSource) return {};

    const tools = createDataTools(toolContextFromState(state), deps.dataSource);
    const byName = new Map<string, { name: string; invoke(args: any): Promise<any> }>(
      tools.map((t) => [t.name, t]),
    );

    // Signatures of calls made in earlier steps, to stop the model repeating itself.
    const earlier = new Set<string>();
    for (const m of state.toolMessages.slice(0, -1)) {
      if (m instanceof AIMessage) for (const c of m.tool_calls ?? []) earlier.add(callSignature(c));
    }

    const results = await Promise.all(
      (last.tool_calls ?? []).map(async (call) => {
        let content: string;
        const tool = byName.get(call.name);
        if (!tool) {
          content = JSON.stringify({
            error: `Unknown tool "${call.name}". Available: ${[...byName.keys()].join(', ')}`,
          });
        } else if (earlier.has(callSignature(call))) {
          content = JSON.stringify({
            error: 'Same call with the same arguments was already made. Use that result or answer.',
          });
        } else {
          try {
            // invoke() validates args against the Zod schema and throws on bad input
            const out = await tool.invoke(call.args);
            content = typeof out === 'string' ? out : JSON.stringify(out);
          } catch (e) {
            content = JSON.stringify({ error: e instanceof Error ? e.message : 'Tool failed' });
          }
        }
        return new ToolMessage({ content, tool_call_id: call.id ?? call.name, name: call.name });
      }),
    );

    return { toolMessages: results };
  };
}