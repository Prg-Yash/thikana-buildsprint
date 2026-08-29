import { Transaction, DayOfWeek, DayOfWeekAnalysis, IncomeCapResult } from "./types";

/**
 * Analyzes transaction spend grouped by Day of the Week.
 * Returns cheapest vs priciest shopping/spending days.
 */
export function analyzeDayOfWeekSpending(transactions: Transaction[]): {
  dayAnalysis: DayOfWeekAnalysis[];
  cheapestDay: DayOfWeek | null;
  priciestDay: DayOfWeek | null;
} {
  const days: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const map = new Map<DayOfWeek, { total: number; count: number }>();

  days.forEach((d) => map.set(d, { total: 0, count: 0 }));

  transactions.forEach((tx) => {
    const current = map.get(tx.dayOfWeek) || { total: 0, count: 0 };
    map.set(tx.dayOfWeek, {
      total: current.total + tx.amount,
      count: current.count + 1,
    });
  });

  const dayAnalysis: DayOfWeekAnalysis[] = days.map((day) => {
    const data = map.get(day) || { total: 0, count: 0 };
    return {
      day,
      totalSpend: Math.round(data.total),
      transactionCount: data.count,
      averageSpend: data.count > 0 ? Math.round(data.total / data.count) : 0,
    };
  });

  // Filter days that had transactions
  const activeDays = dayAnalysis.filter((d) => d.transactionCount > 0);

  if (activeDays.length === 0) {
    return { dayAnalysis, cheapestDay: null, priciestDay: null };
  }

  // Sort by average spend ascending
  activeDays.sort((a, b) => a.averageSpend - b.averageSpend);

  return {
    dayAnalysis,
    cheapestDay: activeDays[0].day,
    priciestDay: activeDays[activeDays.length - 1].day,
  };
}

/**
 * Calculates Income Percentage Budget Caps (20%, 30%, 40%) with fallback when income = 0.
 */
export function evaluateIncomeCategoryCap(
  categoryName: string,
  currentSpend: number,
  monthlyIncome: number,
  categoryCapPercentage: number = 30 // default 30% cap
): IncomeCapResult {
  // Zero Income / Zero Spend Guard
  if (monthlyIncome <= 0) {
    return {
      category: categoryName,
      recommendedCapAmount: 0,
      capPercentage: categoryCapPercentage,
      isExceeded: false,
      currentSpend: Math.round(currentSpend),
      message: `Current spend on '${categoryName}' is ₹${Math.round(currentSpend)}. Set monthly revenue/income in store profile to calculate budget caps.`,
    };
  }

  const recommendedCapAmount = Math.round(monthlyIncome * (categoryCapPercentage / 100));
  const isExceeded = currentSpend > recommendedCapAmount;

  const percentageUsed = Math.round((currentSpend / monthlyIncome) * 100);

  let message = "";
  if (isExceeded) {
    message = `ALERT: '${categoryName}' spend (₹${Math.round(currentSpend)}, ${percentageUsed}% of income) exceeds recommended ${categoryCapPercentage}% budget ceiling (₹${recommendedCapAmount}).`;
  } else {
    message = `'${categoryName}' spend (₹${Math.round(currentSpend)}, ${percentageUsed}% of income) is within safe ${categoryCapPercentage}% budget ceiling (₹${recommendedCapAmount}).`;
  }

  return {
    category: categoryName,
    recommendedCapAmount,
    capPercentage: categoryCapPercentage,
    isExceeded,
    currentSpend: Math.round(currentSpend),
    message,
  };
}
