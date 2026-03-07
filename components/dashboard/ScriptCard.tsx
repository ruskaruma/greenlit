"use client";

import { motion } from "framer-motion";
import { Clock, Calendar } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn, formatTimeAgo, isOverdue } from "@/lib/utils";
import type { ScriptWithClient } from "@/lib/supabase/types";

interface ScriptCardProps {
  script: ScriptWithClient;
  onClick?: () => void;
}

export default function ScriptCard({ script, onClick }: ScriptCardProps) {
  const overdue = isOverdue(script.sent_at, script.status);
  const displayStatus = overdue ? "overdue" as const : script.status;

  const clientInitial = script.client.name.charAt(0).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        "p-4 rounded bg-[var(--card)] border border-[var(--border)] cursor-pointer",
        "hover:border-[var(--muted)]/40 hover:-translate-y-[1px]",
        overdue && "border-l-2 border-l-red-500/30 animate-pulse-red"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-[14px] font-medium text-[var(--text)] truncate leading-tight">
            {script.title}
          </h3>
          {script.version > 1 && (
            <span className="shrink-0 text-[9px] font-medium px-1 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)]">
              v{script.version}
            </span>
          )}
        </div>
        <StatusBadge status={displayStatus} />
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-2">
        <div className="w-5 h-5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[10px] font-medium text-[var(--muted)] shrink-0">
          {clientInitial}
        </div>
        <span className="truncate">
          {script.client.name}
          {script.client.company && (
            <span className="opacity-60"> / {script.client.company}</span>
          )}
        </span>
      </div>

      {script.sent_at && (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] opacity-60">
          <Clock size={11} />
          <span>Sent {formatTimeAgo(script.sent_at)}</span>
        </div>
      )}

      {!script.sent_at && script.created_at && (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] opacity-60">
          <Clock size={11} />
          <span>Created {formatTimeAgo(script.created_at)}</span>
        </div>
      )}

      {script.due_date && (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] opacity-60 mt-1">
          <Calendar size={11} />
          <span>Due {new Date(script.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
      )}
    </motion.div>
  );
}
