import { createServiceClientDirect } from "@/lib/supabase/server";
import { generateEmbedding } from "./ragRetrieval";
import type { MemoryType } from "@/lib/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function storeClientMemory(
  clientId: string,
  content: string,
  memoryType: MemoryType,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase: SupabaseAny = createServiceClientDirect();

  let embedding: number[] | null = null;
  try {
    embedding = await generateEmbedding(content);
  } catch (err) {
    console.error("[memory] Embedding generation failed, storing without vector:", err);
  }

  const { error } = await supabase.from("client_memories").insert({
    client_id: clientId,
    content,
    embedding,
    memory_type: memoryType,
    metadata: metadata ?? null,
  });

  if (error) {
    console.error("[memory] Failed to store memory:", error.message);
  }
}

export function buildMemoryContent(
  action: "approved" | "rejected" | "changes_requested",
  scriptTitle: string,
  feedback: string | null
): string {
  switch (action) {
    case "approved":
      return `Approved script "${scriptTitle}".${feedback ? ` Comment: ${feedback}` : ""}`;
    case "rejected":
      return `Rejected script "${scriptTitle}".${feedback ? ` Reason: ${feedback}` : ""}`;
    case "changes_requested":
      return `Requested changes on "${scriptTitle}".${feedback ? ` Feedback: ${feedback}` : ""}`;
  }
}

export function actionToMemoryType(action: "approved" | "rejected" | "changes_requested"): MemoryType {
  switch (action) {
    case "approved": return "approval";
    case "rejected": return "rejection";
    case "changes_requested": return "feedback";
  }
}
