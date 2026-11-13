// agent/tools/date-utils.ts
// Pure date helpers. Dates are plain "YYYY-MM-DD" strings, so there is no time-of-day
// or time-zone drift once "today" has been resolved in the user's time zone.

export function todayIn(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Returns "YYYY-MM-DD", or null if the combination is not a real calendar date. */
export function toIso(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`. Negative when `to` is before `from`. */
export function daysBetween(from: string, to: string): number {
  const utc = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Returns the number of calendar days in a given year and month (1 = Jan ... 12 = Dec). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Computes the next calendar date (YYYY-MM-DD) for a recurring expense on or after `today`.
 * Handles month-end clamping (e.g. day 31 in April clamps to 30; in Feb clamps to 28/29).
 * If `months` is provided and non-empty, only those month numbers (1-12) are eligible.
 */
export function computeNextDueDate(
  dayOfMonth: number,
  months: number[] = [],
  today: string = todayIn('UTC'),
): string | null {
  if (dayOfMonth < 1 || dayOfMonth > 31) return null;

  const [currYear, currMonth] = today.split('-').map(Number);
  if (!currYear || !currMonth) return null;

  // Search forward up to 24 months (two complete annual cycles)
  for (let offset = 0; offset <= 24; offset++) {
    const totalMonthIndex = currMonth - 1 + offset;
    const year = currYear + Math.floor(totalMonthIndex / 12);
    const month = (totalMonthIndex % 12) + 1;

    if (months && months.length > 0 && !months.includes(month)) {
      continue;
    }

    const maxDay = daysInMonth(year, month);
    const day = Math.min(dayOfMonth, maxDay);
    const iso = toIso(year, month, day);

    if (iso && iso >= today) {
      return iso;
    }
  }

  return null;
}

export interface DueDateInfo {
  nextDueDate: string | null;
  daysUntilDue: number | null;
}

/**
 * Returns nextDueDate and daysUntilDue computed relative to `today`.
 */
export function computeExpenseDueDateInfo(
  expense: { dayOfMonth: number; months?: number[] },
  today: string,
): DueDateInfo {
  const nextDueDate = computeNextDueDate(expense.dayOfMonth, expense.months, today);
  const daysUntilDue = nextDueDate ? daysBetween(today, nextDueDate) : null;
  return { nextDueDate, daysUntilDue };
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function monthNumber(word: string): number {
  if (word.length < 3) return 0;
  const i = MONTHS.findIndex((name) => name.startsWith(word));
  return i === -1 ? 0 : i + 1;
}

export type NormalizeResult =
  | { ok: true; date: string; note?: string }
  | { ok: false; error: string };

/**
 * Converts common date phrasings to YYYY-MM-DD.
 * Supports: ISO, "today/tomorrow/yesterday", "in N days", "Nov 15", "15 Nov 2026",
 * "November 15, 2026", and numeric "11/15/2026" (month/day/year unless the first part > 12).
 * When the year is missing, uses the next occurrence on or after `today`.
 */
export function normalizeDate(input: string, today: string): NormalizeResult {
  const s = input.trim().toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ');
  const fail = (): NormalizeResult => ({
    ok: false,
    error: `Could not read "${input}" as a date. Ask the user for a clearer date.`,
  });
  const good = (date: string, note?: string): NormalizeResult => ({ ok: true, date, ...(note ? { note } : {}) });

  if (s === 'today') return good(today);
  if (s === 'tomorrow') return good(addDays(today, 1));
  if (s === 'yesterday') return good(addDays(today, -1));

  let m = s.match(/^in (\d{1,4}) days?$/);
  if (m) return good(addDays(today, Number(m[1])));

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const iso = toIso(Number(m[1]), Number(m[2]), Number(m[3]));
    return iso ? good(iso) : fail();
  }

  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const [month, day] = a > 12 ? [b, a] : [a, b];
    const iso = toIso(year, month, day);
    if (!iso) return fail();
    return good(iso, a <= 12 && b <= 12 && a !== b ? 'Read as month/day/year.' : undefined);
  }

  const withYear = (year: number | undefined, month: number, day: number): NormalizeResult => {
    if (!month) return fail();
    if (year !== undefined) {
      const iso = toIso(year, month, day);
      return iso ? good(iso) : fail();
    }
    const thisYear = Number(today.slice(0, 4));
    let iso = toIso(thisYear, month, day);
    if (iso && iso < today) iso = toIso(thisYear + 1, month, day);
    return iso ? good(iso, 'Year not given; used the next occurrence on or after today.') : fail();
  };

  // "nov 15", "november 15 2026", "nov 15th"
  m = s.match(/^([a-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?(?: (\d{4}))?$/);
  if (m) return withYear(m[3] ? Number(m[3]) : undefined, monthNumber(m[1]), Number(m[2]));

  // "15 nov", "15th november 2026"
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)? ([a-z]{3,9})\.?(?: (\d{4}))?$/);
  if (m) return withYear(m[3] ? Number(m[3]) : undefined, monthNumber(m[2]), Number(m[1]));

  return fail();
}