import { createServiceClientDirect } from "@/lib/supabase/server";
import ReportsPanel from "@/components/reports/ReportsPanel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

async function getClients() {
  const supabase: SupabaseAny = createServiceClientDirect();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, email, company")
    .order("name", { ascending: true });

  if (error) return [];
  return data ?? [];
}

async function getReports() {
  const supabase: SupabaseAny = createServiceClientDirect();
  const { data, error } = await supabase
    .from("reports")
    .select("*, clients(name, email, company)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reports] Failed to fetch:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    client: row.clients,
  }));
}

export default async function ReportsPage() {
  const [clients, reports] = await Promise.all([getClients(), getReports()]);

  return (
    <div className="min-h-screen bg-[var(--bg)] transition-colors duration-300">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border)]">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
        <div className="h-4 w-px bg-[var(--border)]" />
        <h1 className="text-lg font-semibold text-[var(--text)]">Reports</h1>
      </header>

      {clients.length === 0 ? (
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-sm text-[var(--muted)]">No clients found. Add clients from the dashboard first.</p>
        </div>
      ) : (
        <ReportsPanel clients={clients} initialReports={reports} />
      )}
    </div>
  );
}
