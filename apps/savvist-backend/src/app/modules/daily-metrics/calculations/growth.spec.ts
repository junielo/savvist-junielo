import { calculateGrowth } from './growth';

describe('calculateGrowth', () => {
  it('should calculate growth ratio correctly', () => {
    // curr = 11000, prev = 10000 => (11000 - 10000) / 10000 = 0.10
    expect(calculateGrowth(11000, 10000)).toBe(0.1);
  });

  it('should return 0 when previous total fund is 0 or negative', () => {
    expect(calculateGrowth(11000, 0)).toBe(0);
    expect(calculateGrowth(11000, -100)).toBe(0);
  });

  it('should clamp growth between 0 and 1', () => {
    expect(calculateGrowth(50000, 10000)).toBe(1); // capped at 1
    expect(calculateGrowth(5000, 10000)).toBe(0); // floored at 0
  });
});
