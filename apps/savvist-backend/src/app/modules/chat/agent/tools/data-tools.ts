/* eslint-disable @typescript-eslint/no-explicit-any */
// agent/tools/data-tools.ts
import { daysBetween } from './date-utils';

/* ------------------------------------------------------------------ */
/* Data access interface (adapted by ReadTool)                        */
/* ------------------------------------------------------------------ */

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
