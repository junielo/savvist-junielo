import { WishlistQueryArgs, applyQuery, Row } from './wishlist-query';

describe('WishlistQuery', () => {
  const sampleRows: Row[] = [
    {
      id: '1',
      name: 'Phone',
      amount: 999,
      priority: 'priority',
      status: 'pending',
      createdAt: '2026-10-30',
      purchasedAt: null,
    },
    {
      id: '2',
      name: 'Laptop',
      amount: 1500,
      priority: 'asap',
      status: 'pending',
      createdAt: '2026-10-25',
      purchasedAt: null,
    },
    {
      id: '3',
      name: 'Headphones',
      amount: 500,
      priority: 'normal',
      status: 'pending',
      createdAt: '2026-10-10',
      purchasedAt: null,
    },
    {
      id: '4',
      name: 'Watch',
      amount: 2000,
      priority: 'peripheral',
      status: 'purchased',
      createdAt: '2026-09-15',
      purchasedAt: '2026-09-20',
    },
  ];

  const ctx = { today: '2026-11-08', tz: 'Asia/Manila' };

  it('filters pending items by default when args is empty', () => {
    const args = WishlistQueryArgs.parse({});
    const res = applyQuery(sampleRows, args, ctx);
    expect(res.rows.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('filters items less than 1000', () => {
    const args = WishlistQueryArgs.parse({
      filters: [{ field: 'amount', op: 'lt', value: 1000 }],
    });
    const res = applyQuery(sampleRows, args, ctx);
    expect(res.rows.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('filters items less than or equal to 999', () => {
    const args = WishlistQueryArgs.parse({
      filters: [{ field: 'amount', op: 'lte', value: 999 }],
    });
    const res = applyQuery(sampleRows, args, ctx);
    expect(res.rows.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('filters items between 500 and 1500', () => {
    const args = WishlistQueryArgs.parse({
      filters: [{ field: 'amount', op: 'between', value: 500, valueTo: 1500 }],
    });
    const res = applyQuery(sampleRows, args, ctx);
    expect(res.rows.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('sorts by amount asc and limits to 1 (cheapest)', () => {
    const args = WishlistQueryArgs.parse({
      sort: { field: 'amount', direction: 'asc' },
      limit: 1,
    });
    const res = applyQuery(sampleRows, args, ctx);
    expect(res.rows.map((r) => r.id)).toEqual(['3']);
  });

  it('sorts by priority asc', () => {
    const args = WishlistQueryArgs.parse({
      sort: { field: 'priority', direction: 'asc' },
    });
    const res = applyQuery(sampleRows, args, ctx);
    // asap (2), priority (1), normal (3)
    expect(res.rows.map((r) => r.id)).toEqual(['2', '1', '3']);
  });

  it('filters by status purchased', () => {
    const args = WishlistQueryArgs.parse({
      filters: [{ field: 'status', op: 'eq', value: 'purchased' }],
    });
    const res = applyQuery(sampleRows, args, ctx);
    expect(res.rows.map((r) => r.id)).toEqual(['4']);
  });

  it('filters by status in [pending, purchased]', () => {
    const args = WishlistQueryArgs.parse({
      filters: [{ field: 'status', op: 'in', values: ['pending', 'purchased'] }],
    });
    const res = applyQuery(sampleRows, args, ctx);
    expect(res.rows.map((r) => r.id)).toEqual(['1', '2', '3', '4']);
  });

  it('filters by name contains phone', () => {
    const args = WishlistQueryArgs.parse({
      filters: [{ field: 'name', op: 'contains', value: 'phone' }],
    });
    const res = applyQuery(sampleRows, args, ctx);
    expect(res.rows.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('validates and rejects invalid operator / field combinations', () => {
    const invalid = {
      filters: [{ field: 'amount', op: 'contains', value: 'abc' }],
    };
    const result = WishlistQueryArgs.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts null fields from LLMs and normalizes them cleanly', () => {
    const llmPayload = {
      filters: [
        {
          field: 'status',
          op: 'eq',
          value: 'purchased',
          valueTo: null,
          values: null,
        },
      ],
      period: null,
      sort: null,
      limit: null,
      aggregate: null,
    };
    const result = WishlistQueryArgs.safeParse(llmPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filters[0].value).toBe('purchased');
      expect(result.data.filters[0].valueTo).toBeFalsy();
      expect(result.data.period).toBeFalsy();
      expect(result.data.sort).toBeFalsy();
      expect(result.data.limit).toBeFalsy();
      expect(result.data.aggregate).toBeNull();
    }
  });

  describe('dynamic aggregation', () => {
    const purchasedRows: Row[] = [
      {
        id: '1',
        name: 'Keyboard',
        amount: 3000,
        priority: 'priority',
        status: 'purchased',
        createdAt: '2026-08-01',
        purchasedAt: '2026-08-15',
      },
      {
        id: '2',
        name: 'Monitor',
        amount: 12000,
        priority: 'asap',
        status: 'purchased',
        createdAt: '2026-09-01',
        purchasedAt: '2026-09-10',
      },
      {
        id: '3',
        name: 'Mouse',
        amount: 2500,
        priority: 'normal',
        status: 'purchased',
        createdAt: '2026-09-05',
        purchasedAt: '2026-09-22',
      },
      {
        id: '4',
        name: 'Desk Pad',
        amount: 800,
        priority: 'peripheral',
        status: 'purchased',
        createdAt: '2026-10-01',
        purchasedAt: '2026-10-05',
      },
    ];

    it('aggregates total purchased amount grouped by month', () => {
      const args = WishlistQueryArgs.parse({
        filters: [{ field: 'status', op: 'eq', value: 'purchased' }],
        aggregate: {
          groupBy: 'month',
          dateField: 'purchasedAt',
          metric: 'sum',
        },
      });

      const res = applyQuery(purchasedRows, args, ctx);
      expect(res.aggregateResult).toBeDefined();
      expect(res.aggregateResult?.groupBy).toBe('month');
      expect(res.aggregateResult?.metric).toBe('sum');
      expect(res.aggregateResult?.totalMatched).toBe(4);
      expect(res.aggregateResult?.overallTotal).toBe(18300);

      const groups = res.aggregateResult!.groups;
      expect(groups).toHaveLength(3);

      // 2026-08: Keyboard (3000)
      expect(groups[0].key).toBe('2026-08');
      expect(groups[0].value).toBe(3000);
      expect(groups[0].count).toBe(1);
      expect(groups[0].items).toEqual(['Keyboard']);

      // 2026-09: Monitor (12000) + Mouse (2500) = 14500
      expect(groups[1].key).toBe('2026-09');
      expect(groups[1].value).toBe(14500);
      expect(groups[1].count).toBe(2);
      expect(groups[1].items).toEqual(['Monitor', 'Mouse']);

      // 2026-10: Desk Pad (800)
      expect(groups[2].key).toBe('2026-10');
      expect(groups[2].value).toBe(800);
      expect(groups[2].count).toBe(1);
      expect(groups[2].items).toEqual(['Desk Pad']);
    });

    it('aggregates count grouped by priority', () => {
      const args = WishlistQueryArgs.parse({
        filters: [{ field: 'status', op: 'eq', value: 'purchased' }],
        aggregate: {
          groupBy: 'priority',
          metric: 'count',
        },
      });

      const res = applyQuery(purchasedRows, args, ctx);
      expect(res.aggregateResult).toBeDefined();
      expect(res.aggregateResult?.metric).toBe('count');
      expect(res.aggregateResult?.overallTotal).toBe(4);

      const groups = res.aggregateResult!.groups;
      // asap, priority, normal, peripheral
      expect(groups.map((g) => g.key)).toEqual(['asap', 'priority', 'normal', 'peripheral']);
      expect(groups.find((g) => g.key === 'asap')?.value).toBe(1);
      expect(groups.find((g) => g.key === 'normal')?.value).toBe(1);
    });

    it('aggregates average amount with no groupBy (overall average)', () => {
      const args = WishlistQueryArgs.parse({
        filters: [{ field: 'status', op: 'eq', value: 'purchased' }],
        aggregate: {
          groupBy: null,
          metric: 'avg',
        },
      });

      const res = applyQuery(purchasedRows, args, ctx);
      expect(res.aggregateResult).toBeDefined();
      expect(res.aggregateResult?.groupBy).toBeNull();
      expect(res.aggregateResult?.metric).toBe('avg');
      // (3000 + 12000 + 2500 + 800) / 4 = 18300 / 4 = 4575
      expect(res.aggregateResult?.overallTotal).toBe(4575);
      expect(res.aggregateResult?.groups[0].value).toBe(4575);
    });
  });
});
