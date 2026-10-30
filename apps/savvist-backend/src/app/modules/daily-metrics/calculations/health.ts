export function calculateHealth(
  baseSalary: number,
  totalFund: number,
  totalExpenses: number,
  totalCredit: number,
): number {
  if (baseSalary <= 0) {
    return 0;
  }
  const netIncome = baseSalary - baseSalary * 0.15;
  if (netIncome <= 0) {
    return 0;
  }
  const denominatorFund = baseSalary * 3;
  if (denominatorFund <= 0) {
    return 0;
  }

  const fundRatio = totalFund / denominatorFund;
  const remainingIncome = netIncome - (totalExpenses + totalCredit);
  const incomeRatio = remainingIncome / netIncome;

  const rawHealth = (fundRatio + incomeRatio) / 2;
  const clamped = Math.min(1, Math.max(0, rawHealth));
  return Math.round(clamped * 10000) / 10000;
}
