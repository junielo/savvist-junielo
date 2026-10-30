import { calculateActualCash } from './actual-cash';

describe('calculateActualCash', () => {
  it('should calculate actual cash correctly and floor at zero', () => {
    // A = cash - credit - expenses
    expect(calculateActualCash(10000, 2000, 1500)).toBe(6500);
    expect(calculateActualCash(1000, 2000, 500)).toBe(0); // floored at 0
  });

  it('should handle decimals correctly', () => {
    expect(calculateActualCash(5000.5, 1000.25, 500.1)).toBe(3500.15);
  });
});
