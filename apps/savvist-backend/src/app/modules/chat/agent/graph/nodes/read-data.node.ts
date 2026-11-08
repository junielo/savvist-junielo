import { AgentStateType } from '../agent.state';
import { ReadTool } from '../../tools/read.tool';
import { Types } from 'mongoose';
import { Logger } from '@nestjs/common';
import { saveAgentStateLog } from '../../../../../../../run-logs/run-logger';
const logger = new Logger('ReadDataNode');

export const readDataNodeFactory = (readTool?: ReadTool) => {
  return async function readDataNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    saveAgentStateLog('readDataNode', state)
    const userIdStr = state.context?.userId;
    if (!userIdStr) {
      throw new Error('User ID missing in state context');
    }
    const userId = new Types.ObjectId(userIdStr);
    const intent = state.intentResult?.intent;
    const slots = state.slots;

    if (!readTool) {
      return { readResult: { error: 'ReadTool not available' } };
    }

    let readResult: unknown;

    try {
      switch (intent) {
        case 'read_balances':
          readResult = await readTool.getBalances(userId, slots?.accountName ?? undefined);
          break;
        case 'read_expenses':
          readResult = await readTool.getExpenses(
            userId,
            slots?.searchName ?? undefined,
            slots?.month ? { month: slots.month } : undefined,
          );
          break;
        case 'read_wishlist':
          readResult = await readTool.getWishlist(userId, slots?.searchName ?? undefined);
          break;
        case 'read_record_logs':
          readResult = await readTool.getRecordLogs(userId, {
            search: slots?.searchName ?? undefined,
            limit: slots?.limit ?? undefined,
          });
          break;
        case 'read_profile':
          readResult = await readTool.getProfile(userId);
          break;
        default:
          readResult = { error: `Unsupported read intent: ${intent}` };
      }
    } catch (err) {
      logger.error(`Read failed for intent=${intent}`, err instanceof Error ? err.stack : String(err));
      readResult = { error: 'lookup_failed' };
    }

    return { readResult };
  };
};

export const readDataNode = readDataNodeFactory();