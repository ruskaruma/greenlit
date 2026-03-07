import { createServiceClientDirect } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { isOverdue } from "@/lib/utils";
import type { ScriptWithClient } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

async function getScripts(): Promise<ScriptWithClient[]> {
  const supabase: SupabaseAny = createServiceClientDirect();

  const { data, error } = await supabase
    .from("scripts")
    .select("*, clients(*)")
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch scripts:", error.message);
    return [];
  }

  const scripts = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    client: row.clients,
  })) as ScriptWithClient[];

  return scripts;
}

async function getClients(): Promise<{ id: string; name: string }[]> {
  const supabase: SupabaseAny = createServiceClientDirect();

  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export default async function DashboardPage() {
  const [scripts, clients] = await Promise.all([getScripts(), getClients()]);

  const inReview = scripts.filter(
    (s) => s.status === "pending_review" || s.status === "changes_requested"
  ).length;

  const overdueCount = scripts.filter((s) =>
    isOverdue(s.sent_at, s.status)
  ).length;

  return (
    <DashboardShell
      scripts={scripts}
      clients={clients}
      inReview={inReview}
      overdueCount={overdueCount}
    />
  );
}
