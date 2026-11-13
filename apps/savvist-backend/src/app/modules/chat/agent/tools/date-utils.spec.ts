import {
  daysInMonth,
  computeNextDueDate,
  computeExpenseDueDateInfo,
  daysBetween,
  todayIn,
  toIso,
  addDays,
} from './date-utils';

describe('date-utils', () => {
  describe('daysInMonth', () => {
    it('returns correct days for standard months', () => {
      expect(daysInMonth(2026, 1)).toBe(31); // Jan
      expect(daysInMonth(2026, 4)).toBe(30); // Apr
      expect(daysInMonth(2026, 12)).toBe(31); // Dec
    });

    it('handles February in non-leap vs leap years', () => {
      expect(daysInMonth(2026, 2)).toBe(28); // non-leap
      expect(daysInMonth(2024, 2)).toBe(29); // leap
    });
  });

  describe('computeNextDueDate', () => {
    it('computes next due date in the current month when today is before the day', () => {
      // today: 2026-11-05, expense due on the 15th
      const next = computeNextDueDate(15, [], '2026-11-05');
      expect(next).toBe('2026-11-15');
    });

    it('returns today if expense is due today', () => {
      const next = computeNextDueDate(9, [], '2026-11-09');
      expect(next).toBe('2026-11-09');
    });

    it('rolls over to next month if today is after the day of the current month', () => {
      // condo rent on the 1st, today is 2026-11-09 -> next due date is 2026-12-01
      const next = computeNextDueDate(1, [], '2026-11-09');
      expect(next).toBe('2026-12-01');
    });

    it('clamps day of month to last day of month if day exceeds month length', () => {
      // due on 31st, today is 2026-02-10 -> next due date in Feb is 2026-02-28
      const next = computeNextDueDate(31, [], '2026-02-10');
      expect(next).toBe('2026-02-28');
    });

    it('respects restricted months array', () => {
      // due on 15th, only in March (3) and September (9). Today: 2026-04-01 -> next is 2026-09-15
      const next = computeNextDueDate(15, [3, 9], '2026-04-01');
      expect(next).toBe('2026-09-15');
    });

    it('rolls over into the next year if all matching months in current year have passed', () => {
      // due on 1st of Jan (1). Today: 2026-11-09 -> next is 2027-01-01
      const next = computeNextDueDate(1, [1], '2026-11-09');
      expect(next).toBe('2027-01-01');
    });

    it('returns null for invalid dayOfMonth', () => {
      expect(computeNextDueDate(0, [], '2026-11-09')).toBeNull();
      expect(computeNextDueDate(32, [], '2026-11-09')).toBeNull();
    });
  });

  describe('computeExpenseDueDateInfo', () => {
    it('computes nextDueDate and daysUntilDue properly', () => {
      // Condo rent: day 1, today is 2026-11-09 -> nextDueDate: 2026-12-01, daysUntilDue: 22
      const info = computeExpenseDueDateInfo({ dayOfMonth: 1, months: [] }, '2026-11-09');
      expect(info.nextDueDate).toBe('2026-12-01');
      expect(info.daysUntilDue).toBe(22);
    });

    it('computes daysUntilDue = 0 when due today', () => {
      const info = computeExpenseDueDateInfo({ dayOfMonth: 9, months: [] }, '2026-11-09');
      expect(info.nextDueDate).toBe('2026-11-09');
      expect(info.daysUntilDue).toBe(0);
    });
  });

  describe('daysBetween and addDays', () => {
    it('computes difference between two ISO dates', () => {
      expect(daysBetween('2026-11-09', '2026-12-01')).toBe(22);
      expect(daysBetween('2026-12-01', '2026-11-09')).toBe(-22);
      expect(daysBetween('2026-11-09', '2026-11-09')).toBe(0);
    });

    it('adds days to date', () => {
      expect(addDays('2026-11-09', 5)).toBe('2026-11-14');
      expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    });
  });
});
