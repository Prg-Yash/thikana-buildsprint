import { Transaction, AnomalyAlert } from "./types";

/**
 * Detects financial anomalies:
 * 1. Category Z-Score (Z > 2.0): Transaction amount exceeds category mean.
 * 2. Rolling Spike (Z > 2.5): Sudden surge vs last 3 transactions.
 * 3. Rapid Succession: High-value charges (>80% mean) within 1.0 hr window.
 */
export function detectFinancialAnomalies(transactions: Transaction[]): AnomalyAlert[] {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  const alerts: AnomalyAlert[] = [];

  // Group transactions by category
  const categoryGroups = new Map<string, Transaction[]>();
  transactions.forEach((tx) => {
    const list = categoryGroups.get(tx.category) || [];
    list.push(tx);
    categoryGroups.set(tx.category, list);
  });

  // 1. Category Z-Score Anomaly Check
  categoryGroups.forEach((txs, categoryName) => {
    if (txs.length < 3) return; // Need at least 3 points for meaningful std dev

    const amounts = txs.map((t) => t.amount);
    const mean = amounts.reduce((acc, a) => acc + a, 0) / amounts.length;
    const variance =
      amounts.reduce((acc, a) => acc + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Guard against division by zero if stdDev is 0
    if (stdDev > 0) {
      txs.forEach((tx) => {
        const zScore = (tx.amount - mean) / stdDev;
        if (zScore > 2.0) {
          alerts.push({
            id: `alert_z_${tx.id}`,
            transactionId: tx.id,
            type: "CATEGORY_ZSCORE",
            severity: zScore > 3.0 ? "high" : "medium",
            category: categoryName,
            amount: tx.amount,
            message: `Transaction of ₹${tx.amount} in '${categoryName}' is unusually high (Z-Score: ${zScore.toFixed(1)} vs mean ₹${Math.round(mean)}).`,
            timestampMs: tx.timestampMs,
            zScore: Math.round(zScore * 10) / 10,
          });
        }
      });
    }
  });

  // Sort transactions chronologically
  const sortedTx = [...transactions].sort((a, b) => a.timestampMs - b.timestampMs);

  // 2. Rolling Spike Check (vs last 3 transactions)
  for (let i = 3; i < sortedTx.length; i++) {
    const current = sortedTx[i];
    const prev3 = sortedTx.slice(i - 3, i);
    const prevMean = prev3.reduce((acc, t) => acc + t.amount, 0) / 3;
    const prevVariance = prev3.reduce((acc, t) => acc + Math.pow(t.amount - prevMean, 2), 0) / 3;
    const prevStdDev = Math.sqrt(prevVariance);

    if (prevStdDev > 0) {
      const rollingZ = (current.amount - prevMean) / prevStdDev;
      if (rollingZ > 2.5) {
        // Prevent duplicate alerts for same transaction
        if (!alerts.some((a) => a.transactionId === current.id && a.type === "ROLLING_SPIKE")) {
          alerts.push({
            id: `alert_spike_${current.id}`,
            transactionId: current.id,
            type: "ROLLING_SPIKE",
            severity: "high",
            category: current.category,
            amount: current.amount,
            message: `Sudden expense spike of ₹${current.amount} detected in '${current.category}' vs recent 3-transaction average (₹${Math.round(prevMean)}).`,
            timestampMs: current.timestampMs,
            zScore: Math.round(rollingZ * 10) / 10,
          });
        }
      }
    }
  }

  // 3. Rapid Succession Check (High-value charges > 80% mean within 1.0 hour window)
  const overallMean = sortedTx.reduce((acc, t) => acc + t.amount, 0) / sortedTx.length;
  const ONE_HOUR_MS = 60 * 60 * 1000;

  for (let i = 0; i < sortedTx.length - 1; i++) {
    const txA = sortedTx[i];
    const txB = sortedTx[i + 1];

    if (
      txB.timestampMs - txA.timestampMs <= ONE_HOUR_MS &&
      txA.amount > overallMean * 0.8 &&
      txB.amount > overallMean * 0.8
    ) {
      if (!alerts.some((a) => a.transactionId === txB.id && a.type === "RAPID_SUCCESSION")) {
        alerts.push({
          id: `alert_rapid_${txB.id}`,
          transactionId: txB.id,
          type: "RAPID_SUCCESSION",
          severity: "high",
          category: txB.category,
          amount: txB.amount,
          message: `Rapid succession charges detected: ₹${txA.amount} and ₹${txB.amount} recorded within 1 hour.`,
          timestampMs: txB.timestampMs,
        });
      }
    }
  }

  return alerts.sort((a, b) => b.timestampMs - a.timestampMs);
}
