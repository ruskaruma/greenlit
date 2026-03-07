"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, Pencil, X, Loader2, Clock, User, FileText, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import HitlTimeline from "./HitlTimeline";

interface ChaserCardProps {
  id: string;
  scriptId: string;
  clientName: string;
  clientCompany: string | null;
  scriptTitle: string;
  hoursOverdue: number;
  emailSubject: string;
  draftContent: string;
  createdAt: string;
  onActionComplete: () => void;
}

export default function ChaserCard({
  id,
  scriptId,
  clientName,
  clientCompany,
  scriptTitle,
  hoursOverdue,
  emailSubject,
  draftContent,
  createdAt,
  onActionComplete,
}: ChaserCardProps) {
  const [editedContent, setEditedContent] = useState(draftContent);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [result, setResult] = useState<{ action: string; success: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const hasEdits = editedContent !== draftContent;

  const debouncedSave = useCallback(
    (content: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await fetch(`/api/hitl/${id}/draft`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draft_content: content }),
          });
        } catch {
          // silent
        } finally {
          setSaving(false);
        }
      }, 500);
    },
    [id]
  );

  function handleEditChange(value: string) {
    setEditedContent(value);
    debouncedSave(value);
  }

  async function handleApprove() {
    setLoadingAction("approve");
    try {
      const res = await fetch(`/api/hitl/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editedContent: hasEdits ? editedContent : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      setResult({ action: hasEdits ? "edited" : "approved", success: true });
      toast("success", hasEdits ? "Edited draft sent" : "Draft approved and sent");
      setTimeout(onActionComplete, 1500);
    } catch {
      setResult({ action: "approve", success: false });
      toast("error", "Failed to approve draft");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReject() {
    setLoadingAction("reject");
    try {
      const res = await fetch(`/api/hitl/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setResult({ action: "rejected", success: true });
      toast("success", "Draft rejected");
    } catch {
      setResult({ action: "reject", success: false });
      toast("error", "Failed to reject draft");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRegenerate() {
    setLoadingAction("regenerate");
    try {
      // Mark current chaser as rejected first to prevent duplicate pending_hitl
      await fetch(`/api/hitl/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await fetch(`/api/agent/trigger/${scriptId}`, { method: "POST" });
      if (res.status === 409) {
        toast("info", "Draft already exists in HITL panel");
        return;
      }
      if (!res.ok) throw new Error("Failed to trigger agent");
      toast("info", "Re-generating draft...");
      onActionComplete();
    } catch {
      setResult({ action: "regenerate", success: false });
      toast("error", "Failed to re-generate draft");
    } finally {
      setLoadingAction(null);
    }
  }

  if (result?.success) {
    const completedStage = result.action === "rejected" ? "pending_hitl" as const : "sent" as const;
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.6 }}
        className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6"
      >
        <div className="mb-4">
          <HitlTimeline currentStage={completedStage} />
        </div>
        <p className="text-sm text-[var(--muted)] text-center mb-3">
          {result.action === "approved" && "Approved and sent"}
          {result.action === "edited" && "Edited and sent"}
          {result.action === "rejected" && "Draft rejected"}
        </p>
        {result.action === "rejected" && (
          <div className="flex justify-center">
            <button
              onClick={handleRegenerate}
              disabled={loadingAction === "regenerate"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)] disabled:opacity-40"
            >
              {loadingAction === "regenerate" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RotateCcw size={12} />
              )}
              Re-generate Draft
            </button>
          </div>
        )}
        {result.action !== "rejected" && (
          <>{/* Auto-dismiss for non-reject actions */}</>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User size={13} className="text-[var(--muted)] shrink-0" />
              <span className="text-sm font-medium text-[var(--text)] truncate">
                {clientName}
              </span>
              {clientCompany && (
                <span className="text-xs text-[var(--muted)] opacity-60">{clientCompany}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FileText size={13} className="text-[var(--muted)] shrink-0" />
              <span className="text-xs text-[var(--muted)] truncate">{scriptTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] text-[var(--muted)] opacity-50">
              Generated {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })},{" "}
              {new Date(createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <Clock size={12} />
              <span>{hoursOverdue}h overdue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-6 py-3 border-b border-[var(--border)]">
        <HitlTimeline currentStage="pending_hitl" />
      </div>

      {/* Email preview */}
      <div className="px-6 py-4">
        <p className="text-xs text-[var(--muted)] opacity-60 mb-1">Subject</p>
        <p className="text-sm text-[var(--text)] opacity-80 mb-4">{emailSubject}</p>

        <p className="text-xs text-[var(--muted)] opacity-60 mb-1">
          {isEditing ? "Edit draft" : "Generated draft"}
        </p>

        {isEditing ? (
          <div className="relative">
            <textarea
              value={editedContent}
              onChange={(e) => handleEditChange(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] opacity-80 leading-relaxed focus:outline-none focus:border-[var(--muted)]/40 transition-colors resize-y"
            />
            {saving && (
              <span className="absolute bottom-2 right-3 text-[10px] text-[var(--muted)] opacity-50">Saving...</span>
            )}
          </div>
        ) : (
          <div className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-4 py-3">
            <p className="text-sm text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
              {draftContent}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-[var(--border)] flex items-center gap-3">
        <button
          onClick={handleApprove}
          disabled={loadingAction !== null}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            "bg-[#00ff88] text-[#0a0a0a] hover:bg-[#00dd77]",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          {loadingAction === "approve" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {hasEdits ? "Send Edited" : "Approve & Send"}
        </button>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
            isEditing
              ? "border-orange-400/50 text-orange-400 bg-orange-500/10"
              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--text)]"
          )}
        >
          <Pencil size={14} />
          {isEditing ? "Editing" : "Edit"}
        </button>

        <button
          onClick={handleReject}
          disabled={loadingAction !== null}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--muted)] hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
        >
          {loadingAction === "reject" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <X size={14} />
          )}
          Reject
        </button>
      </div>
    </motion.div>
  );
}
