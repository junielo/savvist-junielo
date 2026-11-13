/* eslint-disable @typescript-eslint/no-explicit-any */
// agent/tools/data-tools.ts
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { addDays, daysBetween, normalizeDate as parseDate, todayIn } from './date-utils';
import { ObservabilityService } from '../observability/observability.service';

/* ------------------------------------------------------------------ */
/* Context and data access (adapt ToolDataSource to ReadTool / Mongo)  */
/* ------------------------------------------------------------------ */

export interface ToolContext {
  userId: string;
  timeZone: string; // users.timeZone, e.g. "Asia/Manila"
  now?: () => Date; // injectable for tests
  observability?: ObservabilityService;
}

export interface ExpenseRow {
  id: string;
  name: string;
  amount: number;
  dueDate: string | null; // YYYY-MM-DD
}

/** Only expenses that HAVE a due date, sorted by dueDate. */
export interface ExpenseDueQuery {
  userId: string;
  order: 'asc' | 'desc';
  limit: number;
  from?: string; // dueDate >= from
  to?: string; // dueDate <= to
}

/** Implement this with your existing ReadTool / expenses service. */
export interface ToolDataSource {
  listExpensesByDueDate(query: ExpenseDueQuery): Promise<ExpenseRow[]>;
  getExpenseById(userId: string, id: string): Promise<ExpenseRow | null>;
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD. Call normalizeDate first for other formats.')
  .refine((d) => new Date(`${d}T00:00:00Z`).toISOString().startsWith(d), 'Not a real calendar date');

/* ------------------------------------------------------------------ */
/* Standalone Core Functions (usable by other modules/services)       */
/* ------------------------------------------------------------------ */

export interface ExpenseRowWithDays extends ExpenseRow {
  dueDate: string;
  daysUntilDue: number;
}

export function filterAndSortExpensesByDueDate(
  rows: ExpenseRow[],
  options: {
    order?: 'asc' | 'desc';
    limit?: number;
    from?: string;
    to?: string;
    today: string;
  },
): ExpenseRowWithDays[] {
  const order = options.order ?? 'asc';
  const limit = options.limit ?? 5;
  return rows
    .filter((r): r is ExpenseRow & { dueDate: string } => {
      if (!r.dueDate) return false;
      if (options.from && r.dueDate < options.from) return false;
      if (options.to && r.dueDate > options.to) return false;
      return true;
    })
    .sort((a, b) =>
      order === 'asc'
        ? a.dueDate.localeCompare(b.dueDate)
        : b.dueDate.localeCompare(a.dueDate),
    )
    .slice(0, limit)
    .map((r) => ({
      ...r,
      daysUntilDue: daysBetween(options.today, r.dueDate),
    }));
}

export function countDaysUntilExpenseDueCore(
  expense: ExpenseRow | null,
  today: string,
  requestedId?: string,
): { error?: string; id?: string; name?: string; dueDate?: string; daysUntilDue?: number } {
  if (!expense) {
    return {
      error: `No expense with id "${requestedId ?? 'unknown'}". Use an id from getUpcomingExpenses or getAllExpenseDateSorted.`,
    };
  }
  if (!expense.dueDate) {
    return { error: `Expense "${expense.name}" has no due date.` };
  }
  return {
    id: expense.id,
    name: expense.name,
    dueDate: expense.dueDate,
    daysUntilDue: daysBetween(today, expense.dueDate),
  };
}

export function countDaysBetweenDatesCore(
  from: string | undefined,
  to: string,
  today: string,
): { from: string; to: string; days: number } {
  const start = from ?? today;
  return { from: start, to, days: daysBetween(start, to) };
}

/* ------------------------------------------------------------------ */
/* Tools. Built per turn because they close over the user and time zone */
/* Every tool is read-only; writes never go through this loop.          */
/* ------------------------------------------------------------------ */

export function createDataTools(ctx: ToolContext, source: ToolDataSource) {
  const today = () => todayIn(ctx.timeZone, ctx.now?.());
  const json = (v: unknown) => JSON.stringify(v);

  const recordCall = (name: string, args: unknown, result: unknown) => {
    ctx.observability?.SetLLMToolCall?.(name, { args, result });
    ctx.observability?.setLLMToolCall?.(name, { args, result });
  };

  /** Fetch, defensively sort/trim, and attach daysUntilDue computed in code. */
  const fetchByDueDate = async (q: Omit<ExpenseDueQuery, 'userId'>) => {
    const rows = await source.listExpensesByDueDate({ userId: ctx.userId, ...q });
    return filterAndSortExpensesByDueDate(rows, {
      order: q.order,
      limit: q.limit,
      from: q.from,
      to: q.to,
      today: today(),
    });
  };

  const getCurrentDate = tool(async () => {
    const res = { today: today(), timeZone: ctx.timeZone };
    recordCall('getCurrentDate', {}, res);
    return json(res);
  }, {
    name: 'getCurrentDate',
    description:
      "Returns today's date (YYYY-MM-DD) in the user's time zone. Only needed when no other tool result already gives the day counts or dates the question needs.",
    schema: z.object({}),
  });

  const normalizeDate = tool(
    async ({ text }) => {
      const r = parseDate(text, today());
      const res = r.ok ? { date: r.date, ...(r.note ? { note: r.note } : {}) } : { error: r.error };
      recordCall('normalizeDate', { text }, res);
      return json(res);
    },
    {
      name: 'normalizeDate',
      description:
        'Converts a date the user wrote (e.g. "Nov 15", "15 November 2026", "11/15/2026", "tomorrow", "in 10 days") into YYYY-MM-DD. ' +
        'Use it before passing a user-written date to another tool. Not needed for dates that tools already returned.',
      schema: z.object({ text: z.string().min(1).max(60) }),
    },
  );

  const getUpcomingExpenses = tool(
    async ({ limit, withinDays }) => {
      const from = today();
      const to = withinDays !== undefined ? addDays(from, withinDays) : undefined;
      const expenses = await fetchByDueDate({ order: 'asc', limit, from, to });
      const res = { count: expenses.length, expenses };
      recordCall('getUpcomingExpenses', { limit, withinDays }, res);
      return json(res);
    },
    {
      name: 'getUpcomingExpenses',
      description:
        "Lists the user's expenses (bills and payments the user pays out) due today or later, soonest first. " +
        'Each row has id, name, amount, dueDate and daysUntilDue (computed in code). ' +
        "Use for 'what is due next', 'what is due this week' (set withinDays), or 'closest due date'. " +
        'Not for overdue or past expenses (use getAllExpenseDateSorted), and not for money owed to the user (reminders).',
      schema: z.object({
        limit: z.number().int().min(1).max(20).default(5),
        withinDays: z.number().int().min(0).max(365).optional().describe('Only expenses due within this many days from today'),
      }),
    },
  );

  const getAllExpenseDateSorted = tool(
    async ({ k, order }) => {
      const expenses = await fetchByDueDate({ order, limit: k });
      const res = { count: expenses.length, expenses };
      recordCall('getAllExpenseDateSorted', { k, order }, res);
      return json(res);
    },
    {
      name: 'getAllExpenseDateSorted',
      description:
        "Returns the top k expenses by due date across ALL dates, including overdue ones. order 'asc' gives the earliest due date first, 'desc' the latest. " +
        'Each row has id, name, amount, dueDate and daysUntilDue (negative means overdue). ' +
        "Use for 'earliest', 'latest', or 'most overdue'. For what is coming up next, prefer getUpcomingExpenses.",
      schema: z.object({
        k: z.number().int().min(1).max(20).default(1),
        order: z.enum(['asc', 'desc']).default('asc'),
      }),
    },
  );

  const countDaysUntilExpenseDue = tool(
    async ({ expenseId }) => {
      const e = await source.getExpenseById(ctx.userId, expenseId);
      const res = countDaysUntilExpenseDueCore(e, today(), expenseId);
      recordCall('countDaysUntilExpenseDue', { expenseId }, res);
      return json(res);
    },
    {
      name: 'countDaysUntilExpenseDue',
      description:
        'Days from today until one specific expense is due (negative if overdue). Requires an expenseId from an earlier tool result. ' +
        'Not needed if the expense row already has daysUntilDue.',
      schema: z.object({ expenseId: z.string().min(1) }),
    },
  );

  const countDaysBetweenDates = tool(
    async ({ from, to }) => {
      const res = countDaysBetweenDatesCore(from, to, today());
      recordCall('countDaysBetweenDates', { from, to }, res);
      return json(res);
    },
    {
      name: 'countDaysBetweenDates',
      description:
        "Counts whole days from one date to another ('from' defaults to today). Negative if 'to' is before 'from'. " +
        'Both dates must be YYYY-MM-DD; use normalizeDate first for dates the user typed.',
      schema: z.object({ from: isoDate.optional(), to: isoDate }),
    },
  );

  return [
    getCurrentDate,
    normalizeDate,
    getUpcomingExpenses,
    getAllExpenseDateSorted,
    countDaysUntilExpenseDue,
    countDaysBetweenDates,
  ];
}