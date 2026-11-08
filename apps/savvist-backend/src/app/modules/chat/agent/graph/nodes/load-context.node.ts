import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import { AgentStateType } from '../agent.state';
import {
  isValidTimeZone,
  ReminderCounter,
  todayIn,
  type TurnContext,
  type UserContextProvider,
  type UserProfile,
} from '../turn-context';
import { ObservabilityService } from '../../observability/observability.service';

export interface LoadContextDeps {
  userContext?: UserContextProvider; // optional: Studio runs without it
  defaultLocale?: string;
  defaultTimeZone?: string;
  now?: () => Date;                  // injectable for tests
  reminders?: ReminderCounter;
  observability?: ObservabilityService;
}

// helper at the top of the file
function userIdFrom(config?: LangGraphRunnableConfig): string | null {
  const configurable = (config?.configurable ?? {}) as Record<string, unknown>;
  const id = configurable['userId'];
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function loadContextNode(deps: LoadContextDeps = {}) {
  return async (
    _state: AgentStateType,
    config?: RunnableConfig,
  ): Promise<Partial<AgentStateType>> => {
    deps.observability?.SetExecutedNode('load-context');
    // userId is passed by the service: graph.invoke(input, { configurable: { thread_id, userId } })
    const userId = userIdFrom(config);

    let profile: UserProfile | null = null;
    if (userId && deps.userContext) {
      try {
        profile = await deps.userContext.getProfile(userId);
      } catch {
        profile = null; // fail soft: defaults are fine for a chat turn
      }
    }

    const timeZone =
      profile?.timeZone && isValidTimeZone(profile.timeZone)
        ? profile.timeZone
        : (deps.defaultTimeZone ?? 'UTC');

    const now = (deps.now ?? (() => new Date()))();

    let dueReminderCount = 0;
    if (userId && deps.reminders) {
      try {
        dueReminderCount = await deps.reminders.countDue(userId, todayIn(timeZone, now));
      } catch {
        dueReminderCount = 0; // fail soft
      }
    }

    const context: TurnContext = {
      userId,
      displayName: profile?.displayName,
      locale: profile?.locale ?? deps.defaultLocale ?? 'en',
      timeZone,
      today: todayIn(timeZone, now),
      nowIso: now.toISOString(),
      dueReminderCount,
    };

    return { context };
  };
}