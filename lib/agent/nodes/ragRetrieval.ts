import { OpenAIEmbeddings } from "@langchain/openai";
import { createServiceClientDirect } from "@/lib/supabase/server";
import type { AgentState } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  dimensions: 1536,
});

export async function retrieveClientMemories(state: AgentState): Promise<AgentState> {
  const supabase: SupabaseAny = createServiceClientDirect();

  try {
    const query = `client ${state.clientName} approval behavior feedback patterns`;
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
    return { ...state, clientMemories: [] };
  }
}

// Shared embedding function for memory storage
export async function generateEmbedding(text: string): Promise<number[]> {
  return embeddings.embedQuery(text);
}
