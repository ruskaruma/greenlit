import Anthropic from "@anthropic-ai/sdk";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { generateEmbedding } from "./ragRetrieval";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const CONSOLIDATION_THRESHOLD = 20;
const SUMMARY_TARGET_COUNT = 6;
const CONSOLIDATION_MODEL = "claude-3-5-haiku-latest";
const CONSOLIDATION_MAX_TOKENS = 1024;

interface ConsolidationResult {
  consolidated: boolean;
  entryCount?: number;
}

interface MemoryEntry {
  id: string;
  memory_type: string;
  content: string;
}

function buildConsolidationPrompt(entries: MemoryEntry[]): string {
  const formatted = entries
    .map((e, i) => `${i + 1}. [${e.memory_type}] ${e.content}`)
    .join("\n");

  return (
    `Here are ${entries.length} memory entries about a client. ` +
    `Summarize them into exactly ${SUMMARY_TARGET_COUNT} concise, factual statements. ` +
    `Each statement should be actionable for someone writing a follow-up email to this client. ` +
    `Return ONLY a JSON array of strings.\n\n` +
    `Entries:\n${formatted}\n\nJSON array:`
  );
}

async function fetchClientMemories(
  supabase: SupabaseAny,
  clientId: string
): Promise<MemoryEntry[]> {
  const { data, error } = await supabase
    .from("client_memories")
    .select("id, memory_type, content")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Fetch memories failed: ${error.message}`);
  return data as MemoryEntry[];
}

async function summarizeEntries(entries: MemoryEntry[]): Promise<string[]> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: CONSOLIDATION_MODEL,
    max_tokens: CONSOLIDATION_MAX_TOKENS,
    messages: [{ role: "user", content: buildConsolidationPrompt(entries) }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text) as string[];
}

async function deleteAllClientMemories(
  supabase: SupabaseAny,
  clientId: string
): Promise<void> {
  const { error } = await supabase
    .from("client_memories")
    .delete()
    .eq("client_id", clientId);

  if (error) throw new Error(`Delete memories failed: ${error.message}`);
}

async function insertConsolidatedMemory(
  supabase: SupabaseAny,
  clientId: string,
  content: string,
  originalCount: number
): Promise<void> {
  let embedding: number[] | null = null;
  try {
    embedding = await generateEmbedding(content);
  } catch {
    console.warn("[memory] Embedding failed for consolidated entry");
  }

  const { error } = await supabase.from("client_memories").insert({
    client_id: clientId,
    content,
    embedding,
    memory_type: "behavioral_pattern",
    metadata: { source: "consolidation", original_count: originalCount },
  });

  if (error) throw new Error(`Insert consolidated memory failed: ${error.message}`);
}

export async function consolidateClientMemories(
  clientId: string
): Promise<ConsolidationResult> {
  const supabase: SupabaseAny = createServiceClientDirect();
  const entries = await fetchClientMemories(supabase, clientId);

  if (entries.length <= CONSOLIDATION_THRESHOLD) {
    return { consolidated: false };
  }

  const summaries = await summarizeEntries(entries);
  await deleteAllClientMemories(supabase, clientId);

  const originalCount = entries.length;
  for (const summary of summaries) {
    await insertConsolidatedMemory(supabase, clientId, summary, originalCount);
  }

  return { consolidated: true, entryCount: summaries.length };
}
