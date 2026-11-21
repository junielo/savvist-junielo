import { AgentStateType } from '../agent.state';
import { ReadTool } from '../../tools/read.tool';
import { ProductSearchService } from '../../tools/product-search.service';
import { Types } from 'mongoose';
import { Logger } from '@nestjs/common';
import { ObservabilityService } from '../../observability/observability.service';
import { normalizeDate } from '../../tools/date-utils';
const logger = new Logger('ReadDataNode');

export interface ReadDataDeps {
  readTool?: ReadTool;
  productSearchService?: ProductSearchService;
  observability?: ObservabilityService;
}

export const readDataNodeFactory = (deps: ReadDataDeps | ReadTool = {}) => {
  const readTool = deps instanceof ReadTool ? deps : deps.readTool;
  const productSearchService = deps instanceof ReadTool ? undefined : deps.productSearchService;
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
      (s: string) => s !== primaryIntent && (s.startsWith('read_') || s === 'search_products'),
    );
    const allIntents = [primaryIntent, ...secondaryIntents].filter(Boolean);

    const executeSingleIntent = async (i: string) => {
      switch (i) {
        case 'search_products': {
          if (!productSearchService) {
            return { error: 'ProductSearchService not available' };
          }
          const query =
            slots?.searchQuery?.trim() ||
            slots?.standaloneQuery?.trim() ||
            slots?.searchName?.trim() ||
            (typeof state.messages[state.messages.length - 1]?.content === 'string'
              ? (state.messages[state.messages.length - 1]?.content as string)
              : '') ||
            '';
          return productSearchService.findProducts(query, {
            count: slots?.limit ?? undefined,
          });
        }
        case 'read_balances': {
          if (!readTool) return { error: 'ReadTool not available' };
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
          if (!readTool) return { error: 'ReadTool not available' };
          return readTool.getExpenses(
            userId,
            slots?.searchName ?? undefined,
            slots?.month ? { month: slots.month } : undefined,
          );
        case 'read_wishlist':
          if (!readTool) return { error: 'ReadTool not available' };
          return readTool.queryWishlist(userId, slots?.readArgs ?? {});
        case 'read_record_logs':
          if (!readTool) return { error: 'ReadTool not available' };
          return readTool.getRecordLogs(userId, {
            search: slots?.searchName ?? undefined,
            limit: slots?.limit ?? undefined,
          });
        case 'read_profile':
          if (!readTool) return { error: 'ReadTool not available' };
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
