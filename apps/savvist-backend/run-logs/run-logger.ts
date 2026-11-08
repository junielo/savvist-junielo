/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as path from 'path';
import { AgentStateType } from '../src/app/modules/chat/agent/graph/agent.state';

/**
 * Converts an AgentStateType into a serializable JSON object.
 */
export function agentStateToJSON(node: string, state: AgentStateType): Record<string, any> {
  return {
    node_name: node,
    timestamp: new Date().toISOString(),
    messages:
      state.messages?.map((msg: any) => ({
        type: typeof msg._getType === 'function' ? msg._getType() : msg.constructor?.name,
        content: msg.content,
        additionalKwargs: msg.additional_kwargs ?? {},
        ...(msg.response_metadata ? { response_metadata: msg.response_metadata } : {}),
      })) ?? [],
    intentResult: state.intentResult ?? null,
    slots: state.slots ?? null,
    readResult: state.readResult ?? null,
    pending_action: state.pending_action ?? null,
    awaiting_clarification: state.awaiting_clarification ?? null,
    context: state.context ?? null,
    clarification_turns: state.clarification_turns ?? 0,
  };
}

/**
 * Converts AgentStateType to a JSON object and appends it to logs.json as an array of records.
 */
export function saveAgentStateLog(node: string, state: AgentStateType, filePath?: string): void {
  const jsonObject = agentStateToJSON(node, state);
  let targetPath = filePath;
  if (!targetPath) {
    const workspaceRunLogsDir = path.join(process.cwd(), 'apps', 'savvist-backend', 'run-logs');
    if (fs.existsSync(workspaceRunLogsDir) || fs.existsSync(path.join(process.cwd(), 'apps', 'savvist-backend'))) {
      targetPath = path.join(workspaceRunLogsDir, 'logs.json');
    } else {
      targetPath = path.join(__dirname, 'logs.json');
    }
  }

  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let records: any[] = [];
  if (fs.existsSync(targetPath)) {
    try {
      const fileContent = fs.readFileSync(targetPath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      if (Array.isArray(parsed)) {
        records = parsed;
      } else if (parsed) {
        records = [parsed];
      }
    } catch {
      records = [];
    }
  }
  records.push(jsonObject);

  try {
    console.log('qwerty', targetPath)
    fs.writeFileSync(targetPath, JSON.stringify(records, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save agent state log:', error);
  }
}

