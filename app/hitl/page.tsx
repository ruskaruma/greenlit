import { createServiceClientDirect } from "@/lib/supabase/server";
import HitlList from "@/components/hitl/HitlList";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface ChaserData {
  id: string;
  draft_content: string;
  created_at: string;
  script_id: string;
  hitl_state: {
    email_subject?: string;
    hours_overdue?: number;
    client_email?: string;
  } | null;
  client: { name: string; company: string | null };
  script: { title: string };
}

async function getPendingChasers(): Promise<ChaserData[]> {
  const supabase: SupabaseAny = createServiceClientDirect();

  const { data, error } = await supabase
    .from("chasers")
    .select("id, draft_content, created_at, script_id, hitl_state, clients(name, company), scripts(title)")
    .eq("status", "pending_hitl")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[hitl] Failed to fetch chasers:", error.message);
    return [];
  }

  const all = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    client: row.clients,
    script: row.scripts,
  })) as ChaserData[];

  // Deduplicate: keep only the most recent chaser per script
  const seen = new Set<string>();
  return all.filter((c) => {
    if (seen.has(c.script_id)) return false;
    seen.add(c.script_id);
    return true;
  });
}

export default async function HitlPage() {
  const chasers = await getPendingChasers();

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 max-w-3xl mx-auto transition-colors duration-300">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
          <div className="h-4 w-px bg-[var(--border)]" />
          <div>
            <h1 className="text-lg font-semibold text-[var(--text)]">HITL Review Panel</h1>
          </div>
        </div>
        {chasers.length > 0 && (
          <span className="text-xs text-[var(--muted)]">
            <span className="text-orange-400 font-medium">{chasers.length}</span> pending
          </span>
        )}
      </header>

      <HitlList initialChasers={chasers} />
    </div>
  );
}
