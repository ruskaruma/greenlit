"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Clock, FileText, User, Calendar, ChevronRight, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn, formatTimeAgo, formatStatus } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import type { ScriptWithClient, ScriptStatus } from "@/lib/supabase/types";

const statusOptions: { key: ScriptStatus; label: string }[] = [
  { key: "pending_review", label: "Pending Review" },
  { key: "changes_requested", label: "Changes Requested" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

interface ScriptDetailSheetProps {
  script: ScriptWithClient;
  onClose: () => void;
  onStatusChange: (scriptId: string, newStatus: ScriptStatus) => void;
}

export default function ScriptDetailSheet({ script, onClose, onStatusChange }: ScriptDetailSheetProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const { toast } = useToast();

  async function handleStatusChange(newStatus: ScriptStatus) {
    if (newStatus === script.status) {
      setShowStatusMenu(false);
      return;
    }
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/scripts/${script.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onStatusChange(script.id, newStatus);
        toast("success", `Status changed to ${formatStatus(newStatus)}`);
      } else {
        toast("error", "Failed to change status");
      }
    } catch {
      toast("error", "Failed to change status");
    } finally {
      setChangingStatus(false);
      setShowStatusMenu(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-screen w-full max-w-md z-50 bg-[var(--card)] border-l border-[var(--border)] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)] truncate pr-4">
            {script.title}
          </h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status with change option */}
          <div className="relative">
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Status</p>
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="flex items-center gap-2 group"
            >
              <StatusBadge status={script.status} />
              <ChevronRight size={12} className="text-[var(--muted)] opacity-0 group-hover:opacity-60" />
              {changingStatus && <Loader2 size={12} className="text-[var(--muted)] animate-spin" />}
            </button>

            {showStatusMenu && (
              <div className="absolute left-0 top-full mt-1 z-10 bg-[var(--card)] border border-[var(--border)] rounded shadow-lg py-1 min-w-[180px]">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleStatusChange(opt.key)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-[11px] hover:bg-[var(--surface-elevated)]",
                      opt.key === script.status
                        ? "text-[var(--text)] font-medium"
                        : "text-[var(--muted)]"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Client info */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Client</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[10px] font-medium text-[var(--muted)]">
                {script.client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-[var(--text)]">{script.client.name}</p>
                {script.client.company && (
                  <p className="text-[11px] text-[var(--muted)] opacity-60">{script.client.company}</p>
                )}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            {script.version > 1 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-1">Version</p>
                <p className="text-sm text-[var(--text)]">v{script.version}</p>
              </div>
            )}
            {script.due_date && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-1">Due Date</p>
                <p className="text-sm text-[var(--text)]">
                  {new Date(script.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
            {script.sent_at && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-1">Sent</p>
                <p className="text-sm text-[var(--text)]">{formatTimeAgo(script.sent_at)}</p>
              </div>
            )}
            {script.reviewed_at && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-1">Reviewed</p>
                <p className="text-sm text-[var(--text)]">{formatTimeAgo(script.reviewed_at)}</p>
              </div>
            )}
          </div>

          {/* Feedback */}
          {script.client_feedback && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Client Feedback</p>
              <div className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-4 py-3">
                <p className="text-sm text-[var(--text)] opacity-80 leading-relaxed">{script.client_feedback}</p>
              </div>
            </div>
          )}

          {/* Script content */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Script Content</p>
            <div className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-4 py-3 max-h-[400px] overflow-y-auto">
              <pre className="font-mono text-sm text-[var(--text)] opacity-80 whitespace-pre-wrap leading-relaxed">
                {script.content}
              </pre>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
