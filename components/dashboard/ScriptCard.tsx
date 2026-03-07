"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Calendar, AlertTriangle, Archive, Bot, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn, formatTimeAgo, isOverdue, getScriptAge } from "@/lib/utils";
import type { ScriptWithClient } from "@/lib/supabase/types";

interface ScriptCardProps {
  script: ScriptWithClient;
  onClick?: () => void;
  onArchive?: (id: string) => void;
  onRunAgent?: (script: { id: string; title: string; client_name: string; due_date: string | null }) => void;
}

export default function ScriptCard({ script, onClick, onArchive, onRunAgent }: ScriptCardProps) {
  const overdue = isOverdue(script.sent_at, script.status) || script.status === "overdue";
  const displayStatus = overdue ? "overdue" as const : script.status;
  const clientInitial = script.client.name.charAt(0).toUpperCase();
  const noContact = !script.client.email && !script.client.whatsapp_number;
  const [archiving, setArchiving] = useState(false);

  const hoursOverdue = overdue && script.sent_at ? getScriptAge(script.sent_at) : 0;
  const daysOverdue = Math.round(hoursOverdue / 24);
  const isCritical = daysOverdue >= 7;
  const isSevere = daysOverdue >= 3;

  const canArchive = script.status === "approved" || script.status === "rejected";

  async function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onArchive) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/scripts/${script.id}/archive`, { method: "PATCH" });
      if (res.ok) onArchive(script.id);
    } catch {
      // silent
    } finally {
      setArchiving(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: script.archived ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        "p-4 rounded bg-[var(--card)] border border-[var(--border)] cursor-pointer",
        "hover:border-[var(--muted)]/40 hover:-translate-y-[1px]",
        overdue && isCritical && "border-l-2 border-l-red-500",
        overdue && isSevere && !isCritical && "border-l-2 border-l-red-500/60",
        overdue && !isSevere && "border-l-2 border-l-amber-500/60",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          {overdue && isSevere && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          )}
          <h3 className="text-[14px] font-medium text-[var(--text)] truncate leading-tight">
            {script.title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isCritical && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider">
              Critical
            </span>
          )}
          <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)]">
            v{script.version}
          </span>
          <StatusBadge status={displayStatus} />
        </div>
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
        {noContact && (
          <span title="No contact info - delivery will fail">
            <AlertTriangle size={12} className="text-amber-400 shrink-0" />
          </span>
        )}
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

      {overdue && onRunAgent && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRunAgent({
              id: script.id,
              title: script.title,
              client_name: script.client.name,
              due_date: script.due_date,
            });
          }}
          className="flex items-center gap-1.5 mt-3 px-2.5 py-1.5 rounded text-[10px] font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)] w-full justify-center"
        >
          <Bot size={11} />
          Run Agent
        </button>
      )}

      {canArchive && !script.archived && onArchive && (
        <button
          onClick={handleArchive}
          disabled={archiving}
          className="flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded text-[10px] text-[var(--muted)] opacity-50 hover:opacity-100 w-full justify-center"
        >
          {archiving ? <Loader2 size={10} className="animate-spin" /> : <Archive size={10} />}
          Archive
        </button>
      )}
    </motion.div>
  );
}
