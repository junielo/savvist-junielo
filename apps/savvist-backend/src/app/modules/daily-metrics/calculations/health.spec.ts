import { calculateHealth } from './health';

describe('calculateHealth', () => {
  it('should calculate health ratio correctly and clamp between 0 and 1', () => {
    // B = 30000, N = 25500
    // F = 45000, F / (30000 * 3) = 45000 / 90000 = 0.5
    // E = 5000, C = 2000 => R = 25500 - 7000 = 18500
    // incomeRatio = 18500 / 25500 ≈ 0.72549
    // raw = (0.5 + 0.72549) / 2 ≈ 0.6127
    const health = calculateHealth(30000, 45000, 5000, 2000);
    expect(health).toBeCloseTo(0.6127, 3);
  });

  it('should return 0 when base salary is 0', () => {
    expect(calculateHealth(0, 45000, 5000, 2000)).toBe(0);
  });

  it('should clamp health at 1 max', () => {
    expect(calculateHealth(30000, 300000, 0, 0)).toBe(1);
  });

  it('should clamp health at 0 min', () => {
    expect(calculateHealth(30000, 0, 50000, 20000)).toBe(0);
  });
});
