import { createServiceClientDirect } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export interface FewShotExample {
  original_draft: string;
  edited_draft: string;
  script_title: string | null;
  tone: string | null;
}

/**
 * Store a few-shot example: the original AI draft paired with the team lead's edit.
 * Used to improve future generation for this client.
 */
export async function storeFewShotExample(params: {
  clientId: string;
  originalDraft: string;
  editedDraft: string;
  scriptTitle: string | null;
  tone?: string | null;
}): Promise<void> {
  const supabase: SupabaseAny = createServiceClientDirect();

  const { error } = await supabase.from("chaser_few_shot_examples").insert({
    client_id: params.clientId,
    original_draft: params.originalDraft,
    edited_draft: params.editedDraft,
    script_title: params.scriptTitle,
    tone: params.tone ?? null,
  });

  if (error) {
    console.error("[fewShot] Failed to store example:", error.message);
    throw error;
  }
}

/**
 * Fetch the most recent few-shot examples for a client.
 * Returns up to `limit` examples, newest first.
 */
export async function getFewShotExamples(
  clientId: string,
  limit = 3
): Promise<FewShotExample[]> {
  const supabase: SupabaseAny = createServiceClientDirect();

  const { data, error } = await supabase
    .from("chaser_few_shot_examples")
    .select("original_draft, edited_draft, script_title, tone")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[fewShot] Failed to fetch examples:", error.message);
    return [];
  }

  return data ?? [];
}
