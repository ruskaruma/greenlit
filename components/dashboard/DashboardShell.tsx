"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar from "./Sidebar";
import KanbanBoard from "./KanbanBoard";
import UploadModal from "./UploadModal";
import RunAgentButton from "./RunAgentButton";
import ToastProvider from "@/components/ui/ToastProvider";
import type { ScriptWithClient } from "@/lib/supabase/types";

interface DashboardShellProps {
  scripts: ScriptWithClient[];
  clients: { id: string; name: string }[];
  inReview: number;
  overdueCount: number;
}

export default function DashboardShell({
  scripts,
  clients: initialClients,
  inReview,
  overdueCount,
}: DashboardShellProps) {
  return (
    <ToastProvider>
      <DashboardShellInner
        scripts={scripts}
        clients={initialClients}
        inReview={inReview}
        overdueCount={overdueCount}
      />
    </ToastProvider>
  );
}

function DashboardShellInner({
  scripts,
  clients: initialClients,
  inReview,
  overdueCount,
}: DashboardShellProps) {
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [clients, setClients] = useState(initialClients);
  const [connected, setConnected] = useState(true);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        const newClients = data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
        setClients(newClients);

        // Fix 5: If active client was deleted, reset filter
        setActiveClientId((prev) => {
          if (prev && !newClients.some((c: { id: string }) => c.id === prev)) {
            return null;
          }
          return prev;
        });
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  const filteredScripts = activeClientId
    ? scripts.filter((s) => s.client_id === activeClientId)
    : scripts;

  return (
    <div className="noise-bg min-h-screen bg-[var(--bg)] flex">
      <Sidebar
        clients={clients}
        onClientFilter={setActiveClientId}
        activeClientId={activeClientId}
        onClientsChange={fetchClients}
      />

      <main className="flex-1 ml-[220px] min-h-screen">
        <header className="flex items-center justify-between h-14 px-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-[var(--text)]">Dashboard</h2>
            <div className="flex items-center gap-3 text-xs text-[var(--muted)] ml-2">
              <span>
                <span className="text-[var(--text)] font-medium">{inReview}</span> in review
              </span>
              {overdueCount > 0 && (
                <span>
                  <span className="text-[var(--text)] font-medium">{overdueCount}</span> overdue
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse glow-green" : "bg-red-400"}`} />
              <span className="text-[11px] text-[var(--muted)]">{connected ? "Live" : "Disconnected"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RunAgentButton scripts={filteredScripts.map((s) => ({ id: s.id, title: s.title, status: s.status, sent_at: s.sent_at }))} />
            <UploadModal />
          </div>
        </header>

        <div className="p-6 overflow-x-auto">
          <KanbanBoard initialScripts={filteredScripts} onConnectionChange={setConnected} />
        </div>
      </main>
    </div>
  );
}
