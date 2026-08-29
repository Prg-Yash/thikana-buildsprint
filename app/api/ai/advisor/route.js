import { genAI } from "@/lib/ai/pinecone";
import { buildDynamicRAGPrompt } from "@/lib/ai/rag-engine";

export async function POST(request) {
  try {
    const { userId, personaId, query: userQuery, chatHistory } = await request.json();

    if (!userQuery || !userQuery.trim()) {
      return new Response(JSON.stringify({ error: "Query prompt is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!genAI) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is missing in .env" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Assemble Dynamic RAG Prompt
    const promptText = await buildDynamicRAGPrompt(
      userId,
      personaId || "cfo",
      userQuery.trim(),
      chatHistory || []
    );

    // 2. Query Gemini Generative AI Model Stream with fallbacks
    const modelsToTry = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash",
    ];
    let resultStream = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        resultStream = await model.generateContentStream(promptText);
        if (resultStream) break;
      } catch (err) {
        console.warn(`Stream model ${modelName} failed, trying fallback:`, err.message);
      }
    }

    if (!resultStream) {
      throw new Error("Could not initialize streaming response from Gemini models.");
    }

    // 3. Transform Gemini Stream into Web ReadableStream for client UI
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of resultStream.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
        } catch (err) {
          console.error("Stream reading error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("AI Business Advisor API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate streaming AI advice." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
