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
    };
    const result = WishlistQueryArgs.safeParse(llmPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filters[0].value).toBe('purchased');
      expect(result.data.filters[0].valueTo).toBeFalsy();
      expect(result.data.period).toBeFalsy();
      expect(result.data.sort).toBeFalsy();
      expect(result.data.limit).toBeFalsy();
    }
  });
});
