import {
  filterAndSortExpensesByDueDate,
  countDaysUntilExpenseDueCore,
  countDaysBetweenDatesCore,
  ExpenseRow,
} from './data-tools';

describe('data-tools standalone functions', () => {
  const sampleExpenses: ExpenseRow[] = [
    { id: '1', name: 'Condo Rent', amount: 14000, dueDate: '2026-12-01' },
    { id: '2', name: 'Internet Bill', amount: 2000, dueDate: '2026-11-15' },
    { id: '3', name: 'Electric Bill', amount: 3500, dueDate: '2026-11-20' },
    { id: '4', name: 'Old Subscription', amount: 500, dueDate: '2026-10-01' },
    { id: '5', name: 'Annual Insurance', amount: 25000, dueDate: '2027-01-15' },
    { id: '6', name: 'No Due Date Expense', amount: 100, dueDate: null },
  ];

  describe('filterAndSortExpensesByDueDate', () => {
    it('filters out expenses without due date and sorts ascending by default', () => {
      const result = filterAndSortExpensesByDueDate(sampleExpenses, {
        today: '2026-11-09',
        limit: 10,
      });

      expect(result).toHaveLength(5);
      expect(result.map((r) => r.name)).toEqual([
        'Old Subscription',
        'Internet Bill',
        'Electric Bill',
        'Condo Rent',
        'Annual Insurance',
      ]);
      // Checks daysUntilDue calculation
      const internet = result.find((r) => r.name === 'Internet Bill');
      expect(internet?.daysUntilDue).toBe(6);
    });

    it('respects descending order', () => {
      const result = filterAndSortExpensesByDueDate(sampleExpenses, {
        today: '2026-11-09',
        order: 'desc',
        limit: 2,
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Annual Insurance');
      expect(result[1].name).toBe('Condo Rent');
    });

    it('filters by from and to bounds', () => {
      const result = filterAndSortExpensesByDueDate(sampleExpenses, {
        today: '2026-11-09',
        from: '2026-11-09',
        to: '2026-11-30',
        limit: 5,
      });

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toEqual(['Internet Bill', 'Electric Bill']);
    });
  });

  describe('countDaysUntilExpenseDueCore', () => {
    it('returns error if expense is null', () => {
      const res = countDaysUntilExpenseDueCore(null, '2026-11-09', 'item-123');
      expect(res.error).toContain('item-123');
    });

    it('returns error if expense has no due date', () => {
      const res = countDaysUntilExpenseDueCore(
        { id: '6', name: 'No Due Date', amount: 100, dueDate: null },
        '2026-11-09',
      );
      expect(res.error).toContain('has no due date');
    });

    it('calculates days until due correctly for valid expense', () => {
      const res = countDaysUntilExpenseDueCore(
        { id: '1', name: 'Condo Rent', amount: 14000, dueDate: '2026-12-01' },
        '2026-11-09',
      );
      expect(res.error).toBeUndefined();
      expect(res.id).toBe('1');
      expect(res.daysUntilDue).toBe(22);
    });
  });

  describe('countDaysBetweenDatesCore', () => {
    it('calculates days from start to target', () => {
      const res = countDaysBetweenDatesCore('2026-11-01', '2026-11-15', '2026-11-09');
      expect(res.days).toBe(14);
    });

    it('defaults start date to today if omitted', () => {
      const res = countDaysBetweenDatesCore(undefined, '2026-11-15', '2026-11-09');
      expect(res.from).toBe('2026-11-09');
      expect(res.days).toBe(6);
    });
  });
});
