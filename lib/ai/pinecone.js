import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME || "thikana-knowledge";
const geminiApiKey = process.env.GEMINI_API_KEY;

export const pinecone = apiKey ? new Pinecone({ apiKey }) : null;
export const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// Local Fallback Playbook Cache for Zero-Downtime Resilience when Pinecone API Key is unconfigured/fails
export const LOCAL_FALLBACK_PLAYBOOK = [
  {
    topic: "Weekend Footfall Boosters",
    category: "Promotions & Marketing",
    content: "Local shoppers engage most between Thursday evening and Saturday afternoon. Publishing a 15-20% discount offer post with photo media on Friday morning increases footfall by up to 35%. Always include a clear call-to-action such as 'Request Call' or 'Visit Store Today'.",
  },
  {
    topic: "Lead Response SLA",
    category: "Customer Service & Conversion",
    content: "Customer call leads conversion drops by 80% if unhandled after 2 hours. Merchants who respond to pending call requests within 15 minutes convert 3x more local inquiries into sales. Use the analytics lead manager to update status to 'Contacted'.",
  },
  {
    topic: "Inventory Turnover & Low Stock",
    category: "Inventory & Stock Control",
    content: "Maintaining low stock (below 5 units) risks stockouts on high-demand items. Running flash bundle sales for slow-moving items frees up cash flow. Cross-promote low-stock products alongside popular fast-sellers in social feed posts.",
  },
  {
    topic: "Service Slot Optimization",
    category: "Appointments & Scheduling",
    content: "For service providers (salons, clinics, repair shops), offering 30-minute time slots with a 10-minute buffer time maximizes daily slot capacity. Setting up weekly availability days prevents booking conflicts and missed appointments.",
  },
  {
    topic: "GST & HSN Tax Compliance",
    category: "Finance & Taxation",
    content: "Indian retail GST rates vary from 0% (exempt groceries/essential food) to 5% (processed food/apparel <1000), 12% (ready-made garments), and 18% (electronics/services). Always input correct 6-digit HSN codes on inventory items to ensure automatic invoice calculations.",
  },
];

export async function generateEmbedding(text) {
  if (!genAI) throw new Error("GEMINI_API_KEY is not configured in .env");
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Hybrid Vector Search with Local Playbook Cache Fallback
 */
export async function queryVectorKnowledge(queryText, topK = 3) {
  // Short query guard: skip vector search for conversational greetings (< 3 words)
  if (!queryText || queryText.trim().split(/\s+/).length < 3) {
    return LOCAL_FALLBACK_PLAYBOOK.slice(0, 2);
  }

  if (!pinecone) {
    console.warn("Pinecone API key not configured, using local fallback playbook.");
    return fallbackKeywordSearch(queryText, topK);
  }

  try {
    const vector = await generateEmbedding(queryText);
    const index = pinecone.index(indexName);

    const queryResponse = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });

    if (queryResponse.matches && queryResponse.matches.length > 0) {
      return queryResponse.matches.map((m) => ({
        score: m.score,
        topic: m.metadata?.topic || "General Advice",
        category: m.metadata?.category || "Retail Strategy",
        content: m.metadata?.content || "",
      }));
    }

    return fallbackKeywordSearch(queryText, topK);
  } catch (err) {
    console.warn("Pinecone vector query failed, using local fallback playbook:", err.message);
    return fallbackKeywordSearch(queryText, topK);
  }
}

function fallbackKeywordSearch(queryText, topK = 3) {
  const words = queryText.toLowerCase().split(/\s+/);
  const scored = LOCAL_FALLBACK_PLAYBOOK.map((item) => {
    let matches = 0;
    const itemText = (item.topic + " " + item.category + " " + item.content).toLowerCase();
    words.forEach((w) => {
      if (w.length > 3 && itemText.includes(w)) matches++;
    });
    return { ...item, score: matches };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
