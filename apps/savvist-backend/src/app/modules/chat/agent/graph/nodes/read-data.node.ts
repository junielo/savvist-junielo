import { AgentStateType } from '../agent.state';
import { ReadTool } from '../../tools/read.tool';
import { Types } from 'mongoose';
import { Logger } from '@nestjs/common';
import { ObservabilityService } from '../../observability/observability.service';
import { normalizeDate } from '../../tools/date-utils';
const logger = new Logger('ReadDataNode');

export interface ReadDataDeps {
  readTool?: ReadTool;
  observability?: ObservabilityService;
}

export const readDataNodeFactory = (deps: ReadDataDeps | ReadTool = {}) => {
  const readTool = deps instanceof ReadTool ? deps : deps.readTool;
  const observability = deps instanceof ReadTool ? undefined : deps.observability;

  return async function readDataNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    observability?.SetExecutedNode('read-data');
    const userIdStr = state.context?.userId;
    if (!userIdStr) {
      throw new Error('User ID missing in state context');
    }
    const userId = new Types.ObjectId(userIdStr);
    const slots = state.slots;
    const primaryIntent = state.intentResult?.intent;
    const secondaryIntents = (state.intentResult?.secondary ?? []).filter(
      (s: string) => s !== primaryIntent && s.startsWith('read_'),
    );
    const allIntents = [primaryIntent, ...secondaryIntents].filter(Boolean);

    if (!readTool) {
      return { readResult: { error: 'ReadTool not available' } };
    }

    const executeSingleIntent = async (i: string) => {
      switch (i) {
        case 'read_balances': {
          const userDate = slots?.date;
          const today = state.context?.today ?? new Date().toISOString().slice(0, 10);
          let targetDay = today;
          if (userDate) {
            const normalized = normalizeDate(userDate, today);
            if (normalized.ok) {
              targetDay = normalized.date;
            }
          }
          return readTool.getBalances(userId, slots?.accountName ?? undefined, targetDay);
        }
        case 'read_expenses':
          return readTool.getExpenses(
            userId,
            slots?.searchName ?? undefined,
            slots?.month ? { month: slots.month } : undefined,
          );
        case 'read_wishlist':
          return readTool.queryWishlist(userId, slots?.readArgs ?? {});
        case 'read_record_logs':
          return readTool.getRecordLogs(userId, {
            search: slots?.searchName ?? undefined,
            limit: slots?.limit ?? undefined,
          });
        case 'read_profile':
          return readTool.getProfile(userId);
        default:
          return { error: `Unsupported read intent: ${i}` };
      }
    };

    let readResult: unknown;

    try {
      if (allIntents.length > 1) {
        // Parallel execution of multiple read intents
        const results = await Promise.all(
          allIntents.map(async (i) => ({ intent: i, data: await executeSingleIntent(i) })),
        );
        const combined: Record<string, unknown> = {};
        for (const r of results) {
          combined[r.intent] = r.data;
        }
        readResult = {
          multiIntent: true,
          intents: allIntents,
          results: combined,
        };
      } else {
        readResult = await executeSingleIntent(primaryIntent);
      }
    } catch (err) {
      logger.error(`Read failed for intent=${allIntents.join(',')}`, err instanceof Error ? err.stack : String(err));
      readResult = { error: 'lookup_failed' };
    }

    return { readResult };
  };
};

export const readDataNode = readDataNodeFactory();
