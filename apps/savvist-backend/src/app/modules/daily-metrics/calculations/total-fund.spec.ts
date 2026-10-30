import { calculateTotalFund } from './total-fund';

describe('calculateTotalFund', () => {
  it('should calculate total fund correctly and floor at zero', () => {
    // F = cash + savings - credit - expenses
    expect(calculateTotalFund(5000, 10000, 2000, 1500)).toBe(11500);
    expect(calculateTotalFund(1000, 500, 3000, 100)).toBe(0); // floored at 0
  });

  it('should handle decimals correctly', () => {
    expect(calculateTotalFund(1000.5, 2000.25, 500.1, 100.05)).toBe(2400.6);
  });
});
