export type DayOfWeek = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: Date;
  month: string; // YYYY-MM
  dayOfWeek: DayOfWeek;
  timestampMs: number;
  description?: string;
}

export interface PredictorResult {
  category: string;
  wmaForecast: number;
  trendFactor: number;
  confidenceTier: "high" | "medium" | "low";
  lowerBound: number;
  upperBound: number;
  monthlyTotals: { month: string; total: number }[];
}

export interface AnomalyAlert {
  id: string;
  transactionId: string;
  type: "CATEGORY_ZSCORE" | "ROLLING_SPIKE" | "RAPID_SUCCESSION";
  severity: "high" | "medium";
  category: string;
  amount: number;
  message: string;
  timestampMs: number;
  zScore?: number;
}

export interface DayOfWeekAnalysis {
  day: DayOfWeek;
  totalSpend: number;
  transactionCount: number;
  averageSpend: number;
}

export interface IncomeCapResult {
  category: string;
  recommendedCapAmount: number;
  capPercentage: number;
  isExceeded: boolean;
  currentSpend: number;
  message: string;
}

// Runtime validator to normalize raw Firestore documents safely into Transaction objects
export function validateAndNormalizeTransactions(rawDocs: any[]): Transaction[] {
  if (!Array.isArray(rawDocs)) return [];

  const dayNames: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const results: Transaction[] = [];

  rawDocs.forEach((docItem, idx) => {
    if (!docItem || typeof docItem !== "object") return;

    // Extract amount safely
    const rawAmount = docItem.amount ?? docItem.price ?? docItem.total ?? docItem.value ?? 0;
    const amount = typeof rawAmount === "number" ? rawAmount : parseFloat(String(rawAmount)) || 0;

    if (amount <= 0) return;

    // Extract date safely
    let date = new Date();
    if (docItem.date) {
      if (typeof docItem.date === "object" && typeof docItem.date.seconds === "number") {
        date = new Date(docItem.date.seconds * 1000);
      } else {
        date = new Date(docItem.date);
      }
    } else if (docItem.createdAt) {
      if (typeof docItem.createdAt === "object" && typeof docItem.createdAt.seconds === "number") {
        date = new Date(docItem.createdAt.seconds * 1000);
      } else {
        date = new Date(docItem.createdAt);
      }
    }

    if (isNaN(date.getTime())) {
      date = new Date();
    }

    const year = date.getFullYear();
    const monthNum = String(date.getMonth() + 1).padStart(2, "0");
    const month = `${year}-${monthNum}`;
    const dayOfWeek = dayNames[date.getDay()];

    results.push({
      id: String(docItem.id || `tx_${idx}_${Date.now()}`),
      amount: Math.abs(amount),
      category: String(docItem.category || docItem.type || "General"),
      date,
      month,
      dayOfWeek,
      timestampMs: date.getTime(),
      description: String(docItem.description || docItem.name || docItem.title || ""),
    });
  });

  return results;
}
