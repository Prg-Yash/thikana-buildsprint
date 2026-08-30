import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { queryVectorKnowledge } from "./pinecone";
import { PERSONAS, PersonaId } from "./personas";
import { validateAndNormalizeTransactions } from "../analytics/types";
import { calculateCategoryWMAPrediction } from "../analytics/spendingPredictor";
import { detectFinancialAnomalies } from "../analytics/anomalyDetector";
import { analyzeDayOfWeekSpending, evaluateIncomeCategoryCap } from "../analytics/expenseRecommender";

export async function fetchLiveMerchantContext(userId: string) {
  if (!userId || userId === "guest") {
    return {
      merchantName: "Guest Merchant",
      businessType: "Retail",
      productsCount: 0,
      lowStockProducts: [],
      pendingLeadsCount: 0,
      totalLeadsCount: 0,
      recentPostsCount: 0,
      totalCatalogValue: 0,
      transactions: [],
    };
  }

  try {
    let merchantName = "Local Store";
    let businessType = "Retail";
    try {
      const bizSnap = await getDoc(doc(db, "businesses", userId));
      if (bizSnap.exists()) {
        merchantName = bizSnap.data().businessName || merchantName;
        businessType = bizSnap.data().business_type || businessType;
      } else {
        const userSnap = await getDoc(doc(db, "users", userId));
        if (userSnap.exists()) {
          merchantName = userSnap.data().name || userSnap.data().displayName || merchantName;
        }
      }
    } catch {
      // Ignore
    }

    // Live Products & Stock
    let lowStockProducts: { name: string; quantity: number; price: number }[] = [];
    let productsCount = 0;
    let totalCatalogValue = 0;
    const rawTxDocs: any[] = [];

    try {
      const prodSnap = await getDocs(collection(db, "users", userId, "products"));
      const prods = prodSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      productsCount = prods.length;

      prods.forEach((p) => {
        const qty = parseInt(p.quantity || "0", 10);
        const price = parseFloat(p.price || "0");
        totalCatalogValue += qty * price;
        if (qty <= 5) {
          lowStockProducts.push({ name: p.name, quantity: qty, price });
        }
        if (p.createdAt) {
          rawTxDocs.push({
            id: p.id,
            amount: price * qty,
            category: p.category || "Inventory",
            createdAt: p.createdAt,
            name: p.name,
          });
        }
      });
    } catch {
      // Ignore
    }

    // Call Requests / Leads
    let pendingLeadsCount = 0;
    let totalLeadsCount = 0;
    try {
      const callsSnap = await getDocs(
        query(collection(db, "call_requests"), where("merchantId", "==", userId))
      );
      totalLeadsCount = callsSnap.size;
      callsSnap.docs.forEach((d) => {
        const data = d.data();
        if ((data.status || "Pending").toLowerCase() === "pending") {
          pendingLeadsCount++;
        }
        if (data.createdAt) {
          rawTxDocs.push({
            id: d.id,
            amount: 250, // Estimated value per lead
            category: "Customer Leads",
            createdAt: data.createdAt,
            name: "Call Lead Inquiry",
          });
        }
      });
    } catch {
      // Ignore
    }

    // Recent Posts
    let recentPostsCount = 0;
    try {
      const postsSnap = await getDocs(
        query(collection(db, "posts"), where("uid", "==", userId))
      );
      recentPostsCount = postsSnap.size;
    } catch {
      // Ignore
    }

    // Live Orders & Store Financial Revenue
    let totalRevenue = 0;
    let totalOrdersCount = 0;
    let pendingOrdersCount = 0;
    try {
      const ordersSnap = await getDocs(collection(db, "users", userId, "orders"));
      totalOrdersCount = ordersSnap.size;
      ordersSnap.docs.forEach((d) => {
        const data = d.data();
        const amt = parseFloat(data.amount || data.totalAmount || 0);
        totalRevenue += amt;
        if ((data.status || "pending").toLowerCase() === "pending") {
          pendingOrdersCount++;
        }
        if (data.timestamp || data.createdAt) {
          rawTxDocs.push({
            id: d.id,
            amount: amt,
            category: "Sales Revenue",
            createdAt: data.timestamp || data.createdAt,
            name: `Order #${data.orderId || d.id}`,
          });
        }
      });
    } catch {
      // Ignore
    }

    const transactions = validateAndNormalizeTransactions(rawTxDocs);

    return {
      merchantName,
      businessType,
      productsCount,
      lowStockProducts,
      totalCatalogValue,
      totalRevenue,
      totalOrdersCount,
      pendingOrdersCount,
      pendingLeadsCount,
      totalLeadsCount,
      recentPostsCount,
      transactions,
    };
  } catch (err) {
    console.error("Error building live merchant context:", err);
    return {
      merchantName: "Local Merchant",
      businessType: "Retail",
      productsCount: 0,
      lowStockProducts: [],
      totalCatalogValue: 0,
      pendingLeadsCount: 0,
      totalLeadsCount: 0,
      recentPostsCount: 0,
      transactions: [],
    };
  }
}

/**
 * Assembles Dynamic Multi-Persona RAG Prompt with Truncated Chat History (last 6 messages / 3 turns)
 */
export async function buildDynamicRAGPrompt(
  userId: string,
  personaId: PersonaId = "cfo",
  merchantQuery: string,
  chatHistory: { role: string; text: string }[] = []
) {
  const persona = PERSONAS[personaId] || PERSONAS.cfo;

  const [liveContext, vectorStrategyHits] = await Promise.all([
    fetchLiveMerchantContext(userId),
    queryVectorKnowledge(merchantQuery, 3),
  ]);

  // Run TypeScript Statistical Engine
  const anomalies = detectFinancialAnomalies(liveContext.transactions);
  const dayOfWeekStats = analyzeDayOfWeekSpending(liveContext.transactions);
  const wmaPrediction = calculateCategoryWMAPrediction(liveContext.transactions, "Inventory");
  const budgetCapCheck = evaluateIncomeCategoryCap("Inventory", liveContext.totalCatalogValue, 100000, 30);

  const knowledgeContext = vectorStrategyHits
    .map((hit) => `• [Strategy: ${hit.topic}] (${hit.category}): ${hit.content}`)
    .join("\n");

  const lowStockSummary =
    liveContext.lowStockProducts.length > 0
      ? liveContext.lowStockProducts.map((p) => `${p.name} (${p.quantity} left)`).join(", ")
      : "None (All items well-stocked)";

  const anomalySummary =
    anomalies.length > 0
      ? anomalies.map((a) => `⚠️ [${a.type}] ${a.message}`).join("\n")
      : "No financial anomalies detected.";

  // Truncate Chat History to last 6 messages (3 turns)
  const truncatedHistory = chatHistory
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Merchant" : persona.name}: ${m.text}`)
    .join("\n");

  const dynamicPrompt = `
${persona.systemPrompt}

=== LIVE MERCHANT CONTEXT ===
• Merchant Name: ${liveContext.merchantName}
• Business Type: ${liveContext.businessType || "Retail Store"}
• Total Store Sales Revenue: ₹${(liveContext.totalRevenue || 0).toLocaleString()}
• Total Orders Processed: ${liveContext.totalOrdersCount || 0} (${liveContext.pendingOrdersCount || 0} pending)
• Total Active Products: ${liveContext.productsCount}
• Inventory Catalog Valuation: ₹${liveContext.totalCatalogValue.toLocaleString()}
• Low / Out-of-Stock Items: ${lowStockSummary}
• Pending Customer Call Leads: ${liveContext.pendingLeadsCount} out of ${liveContext.totalLeadsCount}
• Published Store Updates / Posts: ${liveContext.recentPostsCount}

=== STATISTICAL ANALYTICS ENGINE DATA ===
• Forecasted WMA Spend Next Month: ₹${wmaPrediction.wmaForecast} (Confidence: ${wmaPrediction.confidenceTier.toUpperCase()}, MoM Trend: ${wmaPrediction.trendFactor})
• Financial Anomalies:
${anomalySummary}
• Day of Week Analysis: Priciest Day = ${dayOfWeekStats.priciestDay || "N/A"}, Cheapest Day = ${dayOfWeekStats.cheapestDay || "N/A"}
• Budget Cap Check: ${budgetCapCheck.message}

=== RECENT CHAT CONTEXT ===
${truncatedHistory || "None (First turn)"}

=== CURATED RETAIL PLAYBOOK STRATEGIES (RAG) ===
${knowledgeContext || "• Focus on weekend discounts, prompt lead follow-ups, and stock re-ordering."}

=== CURRENT MERCHANT QUERY ===
"${merchantQuery}"

=== INSTRUCTIONS ===
1. Respond in character as ${persona.name} (${persona.roleTitle}).
2. Use both the LIVE MERCHANT CONTEXT and STATISTICAL ANALYTICS ENGINE DATA to provide tailored advice.
3. Be concise, pragmatic, and helpful in 3-4 short paragraphs.
4. Conclude with 1-2 actionable next steps.
`;

  return dynamicPrompt;
}
