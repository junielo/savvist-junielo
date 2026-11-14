/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

export const PRIORITY_RANK = { asap: 0, priority: 1, important: 2, normal: 3, peripheral: 4 } as const;
export type Priority = keyof typeof PRIORITY_RANK;

export const WISHLIST_FIELDS = {
  amount:      { type: 'number' },
  name:        { type: 'string' },
  status:      { type: 'enum', values: ['pending', 'purchased'] },
  priority:    { type: 'enum', values: Object.keys(PRIORITY_RANK) },
  createdAt:   { type: 'date' },
  purchasedAt: { type: 'date' },
} as const;

export const OPS_BY_TYPE = {
  number: ['eq', 'lt', 'lte', 'gt', 'gte', 'between'],
  date:   ['eq', 'lt', 'lte', 'gt', 'gte', 'between'],
  string: ['eq', 'contains'],
  enum:   ['eq', 'in'],
} as const;

export const PERIOD_TOKENS = [
  'today', 'yesterday', 'last_7_days', 'this_week', 'last_week',
  'this_month', 'last_month', 'this_year',
] as const;

const FieldName = z.enum(['amount', 'name', 'status', 'priority', 'createdAt', 'purchasedAt']);

export const AggregateGroupBy = z.enum(['month', 'year', 'priority', 'status']);
export type AggregateGroupBy = z.infer<typeof AggregateGroupBy>;

export const AggregateMetric = z.enum(['sum', 'count', 'avg', 'min', 'max']);
export type AggregateMetric = z.infer<typeof AggregateMetric>;

export const AggregateArgs = z.object({
  groupBy: AggregateGroupBy.nullish().transform((v) => v ?? null),
  dateField: z.enum(['purchasedAt', 'createdAt']).nullish().transform((v) => v ?? null),
  metric: AggregateMetric.nullish().transform((v) => v ?? 'sum').default('sum'),
  field: z.enum(['amount']).nullish().transform((v) => v ?? 'amount').default('amount'),
});
export type AggregateArgs = z.infer<typeof AggregateArgs>;

export interface AggregateGroupResult {
  key: string;
  value: number;
  count: number;
  totalAmount: number;
  items: string[];
}

export interface AggregateResult {
  groupBy: AggregateGroupBy | null;
  metric: AggregateMetric;
  field: string;
  totalMatched: number;
  overallTotal: number;
  groups: AggregateGroupResult[];
}

export const WishlistQueryArgs = z.object({
  filters: z.array(z.object({
    field: FieldName,
    op: z.enum(['eq', 'lt', 'lte', 'gt', 'gte', 'between', 'contains', 'in']),
    value: z.union([z.string(), z.number()]).nullable().optional(),
    valueTo: z.union([z.string(), z.number()]).nullable().optional(),
    values: z.array(z.string()).nullable().optional(),
  })).max(5).nullish().transform((v) => v ?? []).default([]),
  period: z.object({
    field: z.enum(['createdAt', 'purchasedAt']),
    token: z.enum(PERIOD_TOKENS),
  }).nullable().optional(),
  sort: z.object({
    field: z.enum(['amount', 'priority', 'name', 'createdAt', 'purchasedAt']),
    direction: z.enum(['asc', 'desc']),
  }).nullable().optional(),
  limit: z.number().int().min(1).max(50).nullable().optional(),
  aggregate: AggregateArgs.nullish().transform((v) => v ?? null),
}).superRefine((args, ctx) => {
  for (const [index, f] of (args.filters ?? []).entries()) {
    const fieldConfig = WISHLIST_FIELDS[f.field];
    const allowedOps = OPS_BY_TYPE[fieldConfig.type as keyof typeof OPS_BY_TYPE] as readonly string[];
    if (!allowedOps.includes(f.op)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Operator '${f.op}' not allowed for field '${f.field}' of type '${fieldConfig.type}'`,
        path: ['filters', index, 'op'],
      });
    }
    if (f.op === 'between') {
      if (f.value === undefined || f.valueTo === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Operator 'between' requires both 'value' and 'valueTo'`,
          path: ['filters', index],
        });
      } else if (typeof f.value === 'number' && typeof f.valueTo === 'number' && f.value > f.valueTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `'value' cannot be greater than 'valueTo' in 'between'`,
          path: ['filters', index],
        });
      } else if (typeof f.value === 'string' && typeof f.valueTo === 'string' && f.value > f.valueTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `'value' cannot be greater than 'valueTo' in 'between'`,
          path: ['filters', index],
        });
      }
    }
    if (f.op === 'in') {
      if (!f.values || !Array.isArray(f.values) || f.values.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Operator 'in' requires a non-empty 'values' array`,
          path: ['filters', index, 'values'],
        });
      } else if (fieldConfig.type === 'enum') {
        const allowedValues = (fieldConfig as any).values;
        for (const val of f.values) {
          if (!allowedValues.includes(val)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Value '${val}' not allowed for enum field '${f.field}'`,
              path: ['filters', index, 'values'],
            });
          }
        }
      }
    }
    if (f.op === 'eq' && fieldConfig.type === 'enum') {
      const allowedValues = (fieldConfig as any).values;
      if (f.value !== undefined && !allowedValues.includes(f.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Value '${f.value}' not allowed for enum field '${f.field}'`,
          path: ['filters', index, 'value'],
        });
      }
    }
    if ((fieldConfig.type === 'date' || f.field === 'createdAt' || f.field === 'purchasedAt') && f.value !== undefined && typeof f.value === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Date value '${f.value}' must be in YYYY-MM-DD format`,
          path: ['filters', index, 'value'],
        });
      }
    }
    if ((fieldConfig.type === 'date' || f.field === 'createdAt' || f.field === 'purchasedAt') && f.valueTo !== undefined && typeof f.valueTo === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.valueTo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Date valueTo '${f.valueTo}' must be in YYYY-MM-DD format`,
          path: ['filters', index, 'valueTo'],
        });
      }
    }
  }
});

export type WishlistQueryArgs = z.infer<typeof WishlistQueryArgs>;

export type Filter = NonNullable<WishlistQueryArgs['filters']>[number];

export type Row = {
  id: string;
  name: string;
  amount: number;
  priority: Priority;
  status: 'pending' | 'purchased';
  createdAt: string | null;
  purchasedAt: string | null;
};

const OPS = {
  eq:       (a: any, f: Filter) => a === f.value,
  lt:       (a: any, f: Filter) => a < (f.value as any),
  lte:      (a: any, f: Filter) => a <= (f.value as any),
  gt:       (a: any, f: Filter) => a > (f.value as any),
  gte:      (a: any, f: Filter) => a >= (f.value as any),
  between:  (a: any, f: Filter) => a >= (f.value as any) && a <= (f.valueTo as any),
  contains: (a: any, f: Filter) => String(a).toLowerCase().includes(String(f.value).toLowerCase()),
  in:       (a: any, f: Filter) => (f.values as string[]).includes(a),
} as const;

const testRow = (row: Row, f: Filter) => {
  const v = row[f.field as keyof Row];
  if (v == null) return false;
  const opFn = OPS[f.op as keyof typeof OPS];
  return opFn ? opFn(v, f) : false;
};

export function resolvePeriod(token: typeof PERIOD_TOKENS[number], today: string, timeZone: string): { from: string; to: string } {
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const formatDate = (dt: Date) => dt.toISOString().split('T')[0];

  switch (token) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const yest = new Date(date);
      yest.setUTCDate(yest.getUTCDate() - 1);
      const s = formatDate(yest);
      return { from: s, to: s };
    }
    case 'last_7_days': {
      const fromD = new Date(date);
      fromD.setUTCDate(fromD.getUTCDate() - 6);
      return { from: formatDate(fromD), to: today };
    }
    case 'this_week': {
      const dayOfWeek = date.getUTCDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mon = new Date(date);
      mon.setUTCDate(mon.getUTCDate() + diffToMon);
      return { from: formatDate(mon), to: today };
    }
    case 'last_week': {
      const dayOfWeek = date.getUTCDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const thisMon = new Date(date);
      thisMon.setUTCDate(thisMon.getUTCDate() + diffToMon);
      const lastMon = new Date(thisMon);
      lastMon.setUTCDate(lastMon.getUTCDate() - 7);
      const lastSun = new Date(thisMon);
      lastSun.setUTCDate(lastSun.getUTCDate() - 1);
      return { from: formatDate(lastMon), to: formatDate(lastSun) };
    }
    case 'this_month': {
      const fromS = `${y}-${String(m).padStart(2, '0')}-01`;
      return { from: fromS, to: today };
    }
    case 'last_month': {
      const lastMonthDate = new Date(Date.UTC(y, m - 2, 1));
      const ly = lastMonthDate.getUTCFullYear();
      const lm = lastMonthDate.getUTCMonth() + 1;
      const lastDayOfLastMonth = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
      const fromS = `${ly}-${String(lm).padStart(2, '0')}-01`;
      const toS = `${ly}-${String(lm).padStart(2, '0')}-${String(lastDayOfLastMonth).padStart(2, '0')}`;
      return { from: fromS, to: toS };
    }
    case 'this_year': {
      return { from: `${y}-01-01`, to: today };
    }
    default:
      return { from: today, to: today };
  }
}

export function applyWishlistAggregation(matchedRows: Row[], agg: AggregateArgs): AggregateResult {
  const isPurchasedFilter = matchedRows.some((r) => r.status === 'purchased') || !matchedRows.some((r) => r.status === 'pending');
  const dateField = agg.dateField ?? (isPurchasedFilter ? 'purchasedAt' : 'createdAt');

  const resolveKey = (r: Row): string => {
    if (!agg.groupBy) return 'all';
    switch (agg.groupBy) {
      case 'status':
        return r.status ?? 'pending';
      case 'priority':
        return r.priority ?? 'normal';
      case 'month': {
        const d = dateField === 'purchasedAt' ? (r.purchasedAt ?? r.createdAt) : (r.createdAt ?? r.purchasedAt);
        return d ? d.substring(0, 7) : 'undated';
      }
      case 'year': {
        const d = dateField === 'purchasedAt' ? (r.purchasedAt ?? r.createdAt) : (r.createdAt ?? r.purchasedAt);
        return d ? d.substring(0, 4) : 'undated';
      }
      default:
        return 'all';
    }
  };

  const calcMetric = (amounts: number[], metric: AggregateMetric): number => {
    if (amounts.length === 0) return 0;
    const sum = amounts.reduce((a, b) => a + b, 0);
    switch (metric) {
      case 'sum':
        return sum;
      case 'count':
        return amounts.length;
      case 'avg':
        return Math.round((sum / amounts.length) * 100) / 100;
      case 'min':
        return Math.min(...amounts);
      case 'max':
        return Math.max(...amounts);
      default:
        return sum;
    }
  };

  const groupMap = new Map<string, { rows: Row[]; amounts: number[] }>();

  for (const row of matchedRows) {
    const key = resolveKey(row);
    let group = groupMap.get(key);
    if (!group) {
      group = { rows: [], amounts: [] };
      groupMap.set(key, group);
    }
    group.rows.push(row);
    group.amounts.push(row.amount);
  }

  let sortedKeys = Array.from(groupMap.keys());
  if (agg.groupBy === 'month' || agg.groupBy === 'year') {
    sortedKeys = sortedKeys.sort((a, b) => {
      if (a === 'undated') return 1;
      if (b === 'undated') return -1;
      return a.localeCompare(b);
    });
  } else if (agg.groupBy === 'priority') {
    sortedKeys = sortedKeys.sort((a, b) => {
      const rankA = PRIORITY_RANK[a as Priority] ?? 99;
      const rankB = PRIORITY_RANK[b as Priority] ?? 99;
      return rankA - rankB;
    });
  } else if (agg.groupBy === 'status') {
    sortedKeys = sortedKeys.sort((a, b) => a.localeCompare(b));
  }

  const groups: AggregateGroupResult[] = sortedKeys.map((k) => {
    const g = groupMap.get(k)!;
    const totalAmount = g.amounts.reduce((a, b) => a + b, 0);
    return {
      key: k,
      value: calcMetric(g.amounts, agg.metric),
      count: g.rows.length,
      totalAmount,
      items: g.rows.map((r) => r.name),
    };
  });

  const allAmounts = matchedRows.map((r) => r.amount);

  return {
    groupBy: agg.groupBy ?? null,
    metric: agg.metric,
    field: agg.field,
    totalMatched: matchedRows.length,
    overallTotal: calcMetric(allAmounts, agg.metric),
    groups,
  };
}

export function applyQuery(rows: Row[], args: WishlistQueryArgs, ctx: { today: string; tz: string }) {
  const filters: Filter[] = [...(args.filters ?? [])];

  if (args.period) {
    const { from, to } = resolvePeriod(args.period.token, ctx.today, ctx.tz);
    filters.push({ field: args.period.field, op: 'between', value: from, valueTo: to });
  }

  if (!filters.some(f => f.field === 'status')) {
    filters.push({ field: 'status', op: 'eq', value: 'pending' });
  }

  const matched = rows.filter(r => filters.every(f => testRow(r, f)));

  const aggregateResult = args.aggregate
    ? applyWishlistAggregation(matched, args.aggregate)
    : null;

  let out = [...matched];

  if (args.sort) {
    const { field, direction } = args.sort;
    const key = (r: Row) => (field === 'priority' ? PRIORITY_RANK[r.priority] : (r as any)[field]);
    const cmp = (a: any, b: any) =>
      (Boolean(a == null) as any) - (Boolean(b == null) as any) || (a > b ? 1 : a < b ? -1 : 0);
    out = [...out].sort((x, y) => cmp(key(x), key(y)) * (direction === 'asc' ? 1 : -1));
  }

  if (args.limit) {
    out = out.slice(0, args.limit);
  }

  return { rows: out, appliedFilters: filters, aggregateResult };
}
