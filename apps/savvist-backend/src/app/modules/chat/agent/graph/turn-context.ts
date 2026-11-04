export interface TurnContext {
  userId: string | null;
  displayName?: string;
  locale: string;
  timeZone: string;
  today: string;   // 'YYYY-MM-DD' in the user's time zone
  nowIso: string;  // UTC instant
}

export interface UserProfile {
  locale?: string;
  timeZone?: string;
  displayName?: string;
}

export interface UserContextProvider {
  getProfile(userId: string): Promise<UserProfile | null>;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** 'YYYY-MM-DD' for the instant, as seen in the given time zone. */
export function todayIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}