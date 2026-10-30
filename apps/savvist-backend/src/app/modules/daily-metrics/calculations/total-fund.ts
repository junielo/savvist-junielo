export function calculateTotalFund(
  cashTotal: number,
  savingsTotal: number,
  creditTotal: number,
  expensesMonthlyEquivalent: number,
): number {
  const raw = cashTotal + savingsTotal - creditTotal - expensesMonthlyEquivalent;
  return Math.max(0, Math.round(raw * 100) / 100);
}
