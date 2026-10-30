export function calculateActualCash(
  cashTotal: number,
  creditTotal: number,
  expensesMonthlyEquivalent: number,
): number {
  const raw = cashTotal - creditTotal - expensesMonthlyEquivalent;
  return Math.max(0, Math.round(raw * 100) / 100);
}
