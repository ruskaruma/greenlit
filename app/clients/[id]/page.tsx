import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClientDirect } from "@/lib/supabase/server";
import StatusBadge from "@/components/ui/StatusBadge";
import type { Client, Script, ClientMemory } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

async function getClientData(id: string) {
  const supabase: SupabaseAny = createServiceClientDirect();

  const [clientRes, scriptsRes, memoriesRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase.from("scripts").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("client_memories").select("*").eq("client_id", id).order("created_at", { ascending: false }),
  ]);

  if (clientRes.error || !clientRes.data) return null;

  return {
    client: clientRes.data as Client,
    scripts: (scriptsRes.data ?? []) as Script[],
    memories: (memoriesRes.data ?? []) as ClientMemory[],
  };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getClientData(id);

  if (!data) notFound();

  const { client, scripts, memories } = data;

  const stats = [
    { label: "Total Scripts", value: client.total_scripts },
    { label: "Approved", value: client.approved_count },
    { label: "Rejected", value: client.rejected_count },
    { label: "Changes Requested", value: client.changes_requested_count },
    { label: "Avg Response (hrs)", value: client.avg_response_hours?.toFixed(1) ?? "—" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-[var(--muted)] hover:text-[var(--text)] text-xs mb-4 inline-block"
          >
            &larr; Back to dashboard
          </Link>
          <h1 className="text-xl font-semibold">{client.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
            {client.company && <span>{client.company}</span>}
            <span>{client.email}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">{s.label}</p>
              <p className="text-lg font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Script History */}
        <section className="mb-10">
          <h2 className="text-sm font-medium mb-3">Script History</h2>
          {scripts.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No scripts yet.</p>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
              {scripts.map((script) => (
                <div key={script.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{script.title}</p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">
                      Sent {formatDate(script.sent_at)} &middot; Reviewed {formatDate(script.reviewed_at)}
                    </p>
                  </div>
                  <StatusBadge status={script.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Memories */}
        <section>
          <h2 className="text-sm font-medium mb-3">Memories</h2>
          {memories.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No memories recorded.</p>
          ) : (
            <div className="space-y-2">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-4 py-3"
                >
                  <p className="text-xs">{memory.content}</p>
                  <p className="text-[10px] text-[var(--muted)] mt-1 capitalize">
                    {memory.memory_type.replace(/_/g, " ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
