import { OpenAIEmbeddings } from "@langchain/openai";
import { createServiceClientDirect } from "@/lib/supabase/server";
import type { AgentState } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  dimensions: 1536,
});

function buildContextualQuery(state: AgentState): string {
  const parts = [`client ${state.clientName}`];

  // Add context-specific terms based on situation
  if (state.hoursOverdue > 168) {
    parts.push("unresponsive repeated follow-up escalation");
  } else if (state.hoursOverdue > 72) {
    parts.push("slow response delay patterns");
  } else {
    parts.push("response behavior preferences");
  }

  parts.push(`script review feedback ${state.scriptTitle}`);

  return parts.join(" ");
}

export async function retrieveClientMemories(state: AgentState): Promise<AgentState> {
  const supabase: SupabaseAny = createServiceClientDirect();

  try {
    const query = buildContextualQuery(state);
    const queryEmbedding = await embeddings.embedQuery(query);

    // pgvector cosine distance search
    const { data, error } = await supabase.rpc("match_client_memories", {
      query_embedding: queryEmbedding,
      match_client_id: state.clientId,
      match_count: 5,
    });

    if (error) {
      // Fallback: fetch recent memories without vector search
      console.error("[rag] Vector search failed, falling back to recent:", error.message);
      const { data: fallback } = await supabase
        .from("client_memories")
        .select("content")
        .eq("client_id", state.clientId)
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        ...state,
        clientMemories: (fallback ?? []).map((m: { content: string }) => m.content),
      };
    }

    return {
      ...state,
      clientMemories: (data ?? []).map((m: { content: string }) => m.content),
    };
  } catch (err) {
    console.error("[rag] Embedding generation failed:", err);
    // Last resort: try plain text memories
    try {
      const { data: fallback } = await supabase
        .from("client_memories")
        .select("content")
        .eq("client_id", state.clientId)
        .order("created_at", { ascending: false })
        .limit(3);

      return {
        ...state,
        clientMemories: (fallback ?? []).map((m: { content: string }) => m.content),
      };
    } catch {
      return { ...state, clientMemories: [] };
    }
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    return await embeddings.embedQuery(text);
  } catch (firstErr) {
    console.warn("[embedding] First attempt failed, retrying in 2s:", firstErr);
    await new Promise((r) => setTimeout(r, 2000));
    return embeddings.embedQuery(text);
  }
}
