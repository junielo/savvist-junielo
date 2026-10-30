export function calculateDaysUntilNextPayday(
  todayStr: string,
  salaryDay1?: number | null,
  salaryDay2?: number | null,
): number {
  if (!salaryDay1 && !salaryDay2) {
    return 1;
  }

  const rawPaydays = [salaryDay1, salaryDay2].filter(
    (d): d is number => d != null && !isNaN(d) && d >= 1 && d <= 31,
  );
  if (rawPaydays.length === 0) {
    return 1;
  }
  rawPaydays.sort((a, b) => a - b);

  const [yearStr, monthStr, dayStr] = todayStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const currentDay = parseInt(dayStr, 10);

  const getMaxDay = (y: number, m: number) => new Date(y, m, 0).getDate();

  const potentialPaydays: Date[] = [];

  for (let mOffset = 0; mOffset <= 2; mOffset++) {
    let targetMonth = month + mOffset;
    let targetYear = year;
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }
    const maxD = getMaxDay(targetYear, targetMonth);
    for (const pd of rawPaydays) {
      const effectiveDay = Math.min(pd, maxD);
      const dateObj = new Date(Date.UTC(targetYear, targetMonth - 1, effectiveDay));
      potentialPaydays.push(dateObj);
    }
  }

  const todayDate = new Date(Date.UTC(year, month - 1, currentDay));

  let nextPayday: Date | null = null;
  for (const pdDate of potentialPaydays) {
    if (pdDate.getTime() > todayDate.getTime()) {
      nextPayday = pdDate;
      break;
    }
  }

  if (!nextPayday) {
    return 1;
  }

  const diffMs = nextPayday.getTime() - todayDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

export function calculateTodaysAllowance(
  baseSalary: number,
  actualCash: number,
  salaryDay1?: number | null,
  salaryDay2?: number | null,
  todayStr?: string,
): number {
  if (baseSalary <= 0) {
    return 0;
  }
  const netIncome = baseSalary - baseSalary * 0.15; // N
  const setAside = (netIncome / 2) * 0.2; // Y = (N / 2) * 0.2
  const maxCutoffNet = netIncome / 2; // N / 2

  const effectiveToday = todayStr || new Date().toISOString().slice(0, 10);
  const days = calculateDaysUntilNextPayday(effectiveToday, salaryDay1, salaryDay2);

  const numerator = Math.min(maxCutoffNet, actualCash) - setAside;
  const rawAllowance = numerator / days;
  return Math.max(0, Math.round(rawAllowance * 100) / 100);
}
