import { Transaction, PredictorResult } from "./types";

/**
 * Calculates Weighted Moving Average (WMA) forecast for a specific category.
 * WMA weights: [0.6, 0.3, 0.1] (0.6 = Month T [Most Recent], 0.3 = Month T-1, 0.1 = Month T-2)
 * Capped MoM trend factor ±30%
 */
export function calculateCategoryWMAPrediction(
  transactions: Transaction[],
  categoryName: string
): PredictorResult {
  const categoryTx = transactions.filter(
    (t) => t.category.toLowerCase() === categoryName.toLowerCase()
  );

  // Group by month YYYY-MM
  const monthlyMap = new Map<string, number>();
  categoryTx.forEach((tx) => {
    const current = monthlyMap.get(tx.month) || 0;
    monthlyMap.set(tx.month, current + tx.amount);
  });

  const sortedMonths = Array.from(monthlyMap.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const N = sortedMonths.length;

  // Zero / Small Data Guard
  if (N < 3) {
    const avgSpend = N > 0 ? sortedMonths.reduce((acc, m) => acc + m.total, 0) / N : 0;
    return {
      category: categoryName,
      wmaForecast: Math.round(avgSpend),
      trendFactor: 1.0,
      confidenceTier: "low",
      lowerBound: Math.round(avgSpend * 0.8),
      upperBound: Math.round(avgSpend * 1.2),
      monthlyTotals: sortedMonths,
    };
  }

  // Extract last 3 months
  const mT = sortedMonths[N - 1].total;   // Most recent (weight 0.6)
  const mT1 = sortedMonths[N - 2].total;  // Mid (weight 0.3)
  const mT2 = sortedMonths[N - 3].total;  // Oldest (weight 0.1)

  // Weighted Moving Average
  const baseWMA = mT * 0.6 + mT1 * 0.3 + mT2 * 0.1;

  // Calculate Month-over-Month trend factor
  let momTrend = mT1 > 0 ? mT / mT1 : 1.0;
  // Cap trend factor at ±30% (range 0.70 to 1.30)
  momTrend = Math.max(0.7, Math.min(1.3, momTrend));

  const finalForecast = Math.round(baseWMA * momTrend);

  // Calculate Standard Deviation across monthly totals for confidence bounds
  const meanMonthly = sortedMonths.reduce((acc, m) => acc + m.total, 0) / N;
  const variance =
    sortedMonths.reduce((acc, m) => acc + Math.pow(m.total - meanMonthly, 2), 0) / N;
  const stdDev = Math.sqrt(variance);

  // Determine Confidence Tier
  let confidenceTier: "high" | "medium" | "low" = "high";
  const coefficientOfVariation = meanMonthly > 0 ? stdDev / meanMonthly : 0;

  if (N >= 6 && coefficientOfVariation < 0.25) {
    confidenceTier = "high";
  } else if (N >= 3 && coefficientOfVariation < 0.5) {
    confidenceTier = "medium";
  } else {
    confidenceTier = "low";
  }

  return {
    category: categoryName,
    wmaForecast: finalForecast,
    trendFactor: Math.round(momTrend * 100) / 100,
    confidenceTier,
    lowerBound: Math.max(0, Math.round(finalForecast - stdDev)),
    upperBound: Math.round(finalForecast + stdDev),
    monthlyTotals: sortedMonths,
  };
}
