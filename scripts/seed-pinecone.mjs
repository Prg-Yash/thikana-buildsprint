import fs from "fs";
import path from "path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach((line) => {
    const [key, ...value] = line.split("=");
    if (key && value) {
      process.env[key.trim()] = value.join("=").trim();
    }
  });
}

import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const pineconeApiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME || "thikana-knowledge";
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!pineconeApiKey || !geminiApiKey) {
  console.error("❌ Missing PINECONE_API_KEY or GEMINI_API_KEY in .env");
  process.exit(1);
}

const pinecone = new Pinecone({ apiKey: pineconeApiKey });
const genAI = new GoogleGenerativeAI(geminiApiKey);

const RETAIL_PLAYBOOK_KNOWLEDGE = [
  {
    id: "strategy_1",
    topic: "Weekend Footfall Boosters",
    category: "Promotions & Marketing",
    content: "Local shoppers engage most between Thursday evening and Saturday afternoon. Publishing a 15-20% discount offer post with photo media on Friday morning increases footfall by up to 35%. Always include a clear call-to-action such as 'Request Call' or 'Visit Store Today'.",
  },
  {
    id: "strategy_2",
    topic: "Lead Response SLA",
    category: "Customer Service & Conversion",
    content: "Customer call leads conversion drops by 80% if unhandled after 2 hours. Merchants who respond to pending call requests within 15 minutes convert 3x more local inquiries into sales. Use the analytics lead manager to update status to 'Contacted'.",
  },
  {
    id: "strategy_3",
    topic: "Inventory Turnover & Low Stock",
    category: "Inventory & Stock Control",
    content: "Maintaining low stock (below 5 units) risks stockouts on high-demand items. Running flash bundle sales for slow-moving items frees up cash flow. Cross-promote low-stock products alongside popular fast-sellers in social feed posts.",
  },
  {
    id: "strategy_4",
    topic: "Service Slot Optimization",
    category: "Appointments & Scheduling",
    content: "For service providers (salons, clinics, repair shops), offering 30-minute time slots with a 10-minute buffer time maximizes daily slot capacity. Setting up weekly availability days prevents booking conflicts and missed appointments.",
  },
  {
    id: "strategy_5",
    topic: "GST & HSN Tax Compliance",
    category: "Finance & Taxation",
    content: "Indian retail GST rates vary from 0% (exempt groceries/essential food) to 5% (processed food/apparel <1000), 12% (ready-made garments), and 18% (electronics/services). Always input correct 6-digit HSN codes on inventory items to ensure automatic invoice calculations.",
  },
];

async function seedPineconeIndex() {
  console.log("=================================================");
  console.log("🌲 PINECONE VECTOR INDEX SEEDING SCRIPT");
  console.log("=================================================");

  try {
    // 1. Ensure Pinecone Index exists
    console.log(`📡 Checking Pinecone Index '${indexName}'...`);
    const indexList = await pinecone.listIndexes();
    const existingIndexNames = indexList.indexes?.map((i) => i.name) || [];

    if (existingIndexNames.includes(indexName)) {
      console.log(`⚙️ Re-creating Pinecone Index '${indexName}' for 3072 dimension match...`);
      await pinecone.deleteIndex(indexName);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    console.log(`⚙️ Creating Serverless Index '${indexName}' (Dimension: 3072, Metric: cosine)...`);
    await pinecone.createIndex({
      name: indexName,
      dimension: 3072,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });
    console.log("⏳ Waiting 15s for Pinecone index initialization...");
    await new Promise((resolve) => setTimeout(resolve, 15000));

    const index = pinecone.index(indexName);
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    // 2. Generate Embeddings & Upsert
    const vectors = [];
    for (const item of RETAIL_PLAYBOOK_KNOWLEDGE) {
      console.log(`🔤 Generating embedding for playbook item '${item.topic}'...`);
      const result = await embeddingModel.embedContent(item.content);
      const values = result.embedding.values;

      vectors.push({
        id: item.id,
        values,
        metadata: {
          topic: item.topic,
          category: item.category,
          content: item.content,
        },
      });
    }

    console.log(`🚀 Built ${vectors.length} vectors to upsert.`);
    console.log("Vector #1 ID:", vectors[0]?.id);
    console.log("Vector #1 Values Length:", vectors[0]?.values?.length);

    await index.upsert({ records: vectors });
    console.log("=================================================");
    console.log("✅ PINECONE INDEX SEEDED SUCCESSFULLY!");
    console.log("=================================================");
  } catch (err) {
    console.error("❌ Error seeding Pinecone index:", err);
  }
}

seedPineconeIndex();
