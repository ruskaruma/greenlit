import { createServiceClientDirect } from "@/lib/supabase/server";
import type { AgentState } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function monitorOverdueScripts(): Promise<AgentState[]> {
  const supabase: SupabaseAny = createServiceClientDirect();

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: scripts, error } = await supabase
    .from("scripts")
    .select("id, title, content, client_id, sent_at, due_date, clients(id, name, email)")
    .eq("status", "pending_review")
    .lt("sent_at", cutoff)
    .order("sent_at", { ascending: true });

  if (error) {
    console.error("[monitor] Failed to query overdue scripts:", error.message);
    return [];
  }

  if (!scripts || scripts.length === 0) return [];

  // Filter out scripts that already have a chaser sent in the last 24 hours
  const recentChaserCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const results: AgentState[] = [];

  for (const script of scripts) {
    const { data: recentChasers } = await supabase
      .from("chasers")
      .select("id")
      .eq("script_id", script.id)
      .gte("created_at", recentChaserCutoff)
      .limit(1);

    if (recentChasers && recentChasers.length > 0) continue;

    const client = script.clients;
    if (!client) continue;

    const sentDate = new Date(script.sent_at);
    const hoursOverdue = Math.round((Date.now() - sentDate.getTime()) / (1000 * 60 * 60));

    results.push({
      scriptId: script.id,
      clientId: client.id,
      clientEmail: client.email,
      clientName: client.name,
      scriptTitle: script.title,
      scriptContent: script.content,
      sentAt: script.sent_at,
      dueDate: script.due_date ?? null,
      hoursOverdue,
      clientMemories: [],
      generatedEmail: null,
      emailSubject: null,
      chaserId: null,
      error: null,
      urgencyScore: null,
      toneRecommendation: null,
      critiqueScores: null,
      revisionCount: 0,
      nodeExecutionLog: [],
    });
  }

  console.log(`[monitor] Found ${results.length} overdue scripts needing chasers`);
  return results;
}
