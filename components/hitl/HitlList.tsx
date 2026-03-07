"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, Clock } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import ChaserCard from "./ChaserCard";
import ToastProvider from "@/components/ui/ToastProvider";
import type { ChaserData } from "@/app/hitl/page";

interface HitlListProps {
  initialChasers: ChaserData[];
  memories: Record<string, { content: string; memory_type: string; created_at: string }[]>;
}

export default function HitlList({ initialChasers, memories }: HitlListProps) {
  const [chasers, setChasers] = useState(initialChasers);
  const [selectedId, setSelectedId] = useState<string | null>(chasers[0]?.id ?? null);
  const router = useRouter();

  function handleActionComplete(id: string) {
    setChasers((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
    router.refresh();
  }

  if (chasers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center mb-4">
          <Bot size={20} className="text-[var(--muted)]" />
        </div>
        <p className="text-sm text-[var(--muted)] mb-1">No drafts pending approval</p>
        <p className="text-xs text-[var(--muted)] opacity-60 mb-4 text-center max-w-xs">
          Run the agent on an overdue script to generate a chase draft
        </p>
        <Link
          href="/dashboard"
          className="text-xs text-[var(--text)] border border-[var(--border)] px-3 py-1.5 rounded hover:bg-[var(--surface-elevated)]"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const selected = chasers.find((c) => c.id === selectedId) ?? chasers[0];

  return (
    <ToastProvider>
      <div className="flex gap-6 min-h-[600px]">
        {/* Left: Chaser list */}
        <div className="w-[280px] shrink-0 border-r border-[var(--border)] pr-4 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-3 px-2">
            Pending Drafts ({chasers.length})
          </p>
          {chasers.map((chaser) => {
            const isActive = chaser.id === selected.id;
            return (
              <button
                key={chaser.id}
                onClick={() => setSelectedId(chaser.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[var(--surface-elevated)] border border-[var(--border)]"
                    : "hover:bg-[var(--surface-elevated)]/50"
                }`}
              >
                <p className={`text-xs font-medium truncate ${isActive ? "text-[var(--text)]" : "text-[var(--muted)]"}`}>
                  {chaser.script.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[var(--muted)] opacity-60 truncate">
                    {chaser.client.name}
                  </span>
                  <span className="text-[10px] text-[var(--muted)] opacity-40 flex items-center gap-0.5 shrink-0">
                    <Clock size={8} />
                    {formatTimeAgo(chaser.created_at)}
                  </span>
                </div>
                {chaser.status === "draft_saved" && (
                  <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)]">
                    Saved
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Selected chaser detail */}
        <div className="flex-1 min-w-0">
          <ChaserCard
            key={selected.id}
            chaser={selected}
            memories={memories[selected.client_id] ?? []}
            onActionComplete={() => handleActionComplete(selected.id)}
          />
        </div>
      </div>
    </ToastProvider>
  );
}
