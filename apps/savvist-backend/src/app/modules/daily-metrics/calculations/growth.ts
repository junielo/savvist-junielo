export function calculateGrowth(
  currTtlFund: number,
  prevTtlFund: number,
): number {
  if (prevTtlFund <= 0) {
    return 0;
  }
  const rawGrowth = (currTtlFund - prevTtlFund) / prevTtlFund;
  const clamped = Math.min(1, Math.max(0, rawGrowth));
  return Math.round(clamped * 10000) / 10000;
}
