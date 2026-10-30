import { calculateDaysUntilNextPayday, calculateTodaysAllowance } from './todays-allowance';

describe('calculateDaysUntilNextPayday', () => {
  it('should find days until next payday correctly', () => {
    // Paydays 15 and 30
    expect(calculateDaysUntilNextPayday('2026-10-10', 15, 30)).toBe(5); // Oct 15
    expect(calculateDaysUntilNextPayday('2026-10-15', 15, 30)).toBe(15); // Next is Oct 30
    expect(calculateDaysUntilNextPayday('2026-10-30', 15, 30)).toBe(16); // Next is Nov 15
  });

  it('should handle month end adjustment (e.g. Feb 30 -> Feb 28)', () => {
    expect(calculateDaysUntilNextPayday('2026-02-20', 15, 30)).toBe(8); // Feb 28
  });

  it('should fallback to 1 if no salary days provided', () => {
    expect(calculateDaysUntilNextPayday('2026-10-10', null, null)).toBe(1);
  });
});

describe('calculateTodaysAllowance', () => {
  it('should calculate todays allowance correctly', () => {
    // Base salary 30000, net = 25500, cutoff net = 12750, setAside = 12750 * 0.2 = 2550
    // Actual cash = 20000. min(12750, 20000) - 2550 = 12750 - 2550 = 10200
    // Days = 10 -> 10200 / 10 = 1020
    const allowance = calculateTodaysAllowance(30000, 20000, 15, 30, '2026-10-05');
    expect(allowance).toBe(1020);
  });

  it('should return 0 if base salary is 0', () => {
    expect(calculateTodaysAllowance(0, 20000, 15, 30, '2026-10-05')).toBe(0);
  });
});
