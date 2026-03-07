"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Check, X, Loader2, Clock, User, FileText, RotateCcw,
  ChevronDown, ChevronUp, Mail, Phone, Send, Save,
} from "lucide-react";
import { cn, formatTimeAgo } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import type { ChaserData } from "@/app/hitl/page";

interface ChaserCardProps {
  chaser: ChaserData;
  memories: { content: string; memory_type: string; created_at: string }[];
  onActionComplete: () => void;
}

const SCORE_LABELS: Record<string, string> = {
  professionalism: "Tone",
  personalization: "Personalisation",
  clarity: "Clarity",
  persuasiveness: "Urgency",
};

export default function ChaserCard({ chaser, memories, onActionComplete }: ChaserCardProps) {
  const { id, script_id: scriptId, client, script, hitl_state: hitlState } = chaser;
  const [editedContent, setEditedContent] = useState(chaser.draft_content);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [result, setResult] = useState<{ action: string; success: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const isSaved = chaser.status === "draft_saved";
  const hasEdits = editedContent !== chaser.draft_content;
  const scores = hitlState?.critique_scores;
  const daysSinceSent = script.sent_at
    ? Math.round((Date.now() - new Date(script.sent_at).getTime()) / 86400000)
    : null;
  const deliveryChannel = client.preferred_channel === "both" ? "email & WhatsApp" : client.preferred_channel;
  const deliveryTarget = client.preferred_channel === "whatsapp" ? client.whatsapp_number : client.email;

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
        body: JSON.stringify({ editedContent: hasEdits ? editedContent : undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      setResult({ action: hasEdits ? "edited" : "approved", success: true });
      toast("success", hasEdits ? "Edited draft sent" : "Draft approved and sent");
      setTimeout(onActionComplete, 1500);
    } catch {
      toast("error", "Failed to approve draft");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSaveDraft() {
    setLoadingAction("save");
    try {
      const res = await fetch(`/api/hitl/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedContent: hasEdits ? editedContent : undefined, saveOnly: true }),
      });
      if (!res.ok) throw new Error("Failed");
      toast("success", "Draft saved for later");
    } catch {
      toast("error", "Failed to save draft");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReject() {
    setLoadingAction("reject");
    try {
      const res = await fetch(`/api/hitl/${id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error("Failed");
      setResult({ action: "rejected", success: true });
      toast("success", "Draft rejected");
    } catch {
      toast("error", "Failed to reject draft");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRegenerate() {
    setLoadingAction("regenerate");
    try {
      await fetch(`/api/hitl/${id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const res = await fetch(`/api/agent/trigger/${scriptId}`, { method: "POST" });
      if (res.status === 409) {
        toast("info", "Draft already exists in HITL panel");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      toast("info", "Re-generating draft...");
      onActionComplete();
    } catch {
      toast("error", "Failed to re-generate draft");
    } finally {
      setLoadingAction(null);
    }
  }

  if (result?.success) {
    return (
      <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0.6 }} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
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
              {loadingAction === "regenerate" ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Re-generate Draft
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  const scriptPreview = script.content.length > 300 ? script.content.slice(0, 300) + "..." : script.content;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-[var(--muted)]" />
          <span className="text-sm font-medium text-[var(--text)]">{script.title}</span>
          {script.platform && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)]">{script.platform}</span>}
          {isSaved && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)]">
              Saved — not sent yet
            </span>
          )}
        </div>
        <span className="text-[11px] text-[var(--muted)] opacity-50">
          Generated {formatTimeAgo(chaser.created_at)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
        {/* Left: Context */}
        <div className="p-6 space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Script Content</p>
            <div className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-4 py-3">
              <p className="text-xs text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
                {expanded ? script.content : scriptPreview}
              </p>
              {script.content.length > 300 && (
                <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 mt-2 text-[10px] text-[var(--muted)] hover:text-[var(--text)]">
                  {expanded ? <><ChevronUp size={10} /> Show less</> : <><ChevronDown size={10} /> Show full script</>}
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Client</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <User size={12} className="text-[var(--muted)]" />
                <span className="text-xs text-[var(--text)]">{client.name}</span>
                {client.company && <span className="text-xs text-[var(--muted)] opacity-60">/ {client.company}</span>}
              </div>
              <div className="flex items-center gap-4 text-[11px] text-[var(--muted)]">
                {client.email && (
                  <span className="flex items-center gap-1"><Mail size={10} /> {client.email}</span>
                )}
                {client.whatsapp_number && (
                  <span className="flex items-center gap-1"><Phone size={10} /> {client.whatsapp_number}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-[11px] text-[var(--muted)]">
                {client.avg_response_hours != null && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> Usually responds in ~{Math.round(client.avg_response_hours)}hrs
                  </span>
                )}
                {script.assigned_writer && (
                  <span>Writer: {script.assigned_writer}</span>
                )}
              </div>
              {daysSinceSent !== null && (
                <div className="flex items-center gap-1 text-[11px] text-red-400">
                  <Clock size={10} />
                  <span>{daysSinceSent} days since sent</span>
                </div>
              )}
            </div>
          </div>

          {memories.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Client History</p>
              <div className="space-y-2">
                {memories.map((m, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] opacity-40 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--text)] opacity-80">{m.content}</p>
                      <p className="text-[10px] text-[var(--muted)] opacity-40">
                        {m.memory_type} &middot; {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scores && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Critique Scores</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SCORE_LABELS).map(([key, label]) => {
                  const val = scores[key as keyof typeof scores];
                  if (val == null) return null;
                  const num = typeof val === "number" ? val : 0;
                  return (
                    <div key={key} className="flex items-center justify-between bg-[var(--input-bg)] border border-[var(--border)] rounded px-3 py-1.5">
                      <span className="text-[11px] text-[var(--muted)]">{label}</span>
                      <span className={cn("text-xs font-medium", num >= 7 ? "text-emerald-400" : num >= 4 ? "text-amber-400" : "text-red-400")}>
                        {num}/10
                      </span>
                    </div>
                  );
                })}
                {scores.average != null && (
                  <div className="flex items-center justify-between bg-[var(--input-bg)] border border-[var(--border)] rounded px-3 py-1.5 col-span-2">
                    <span className="text-[11px] text-[var(--muted)]">Average</span>
                    <span className={cn("text-xs font-semibold", scores.average >= 7 ? "text-emerald-400" : scores.average >= 4 ? "text-amber-400" : "text-red-400")}>
                      {scores.average.toFixed(1)}/10
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Draft */}
        <div className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50">
              {isSaved ? "Saved Draft" : hasEdits ? "Edited Draft" : "AI-Generated Draft"}
            </p>
            {saving && <span className="text-[10px] text-[var(--muted)] opacity-50">Saving...</span>}
          </div>

          {hitlState?.email_subject && (
            <div className="mb-3">
              <p className="text-[10px] text-[var(--muted)] opacity-50 mb-0.5">Subject</p>
              <p className="text-sm text-[var(--text)] opacity-80">{hitlState.email_subject}</p>
            </div>
          )}

          <textarea
            value={editedContent}
            onChange={(e) => handleEditChange(e.target.value)}
            rows={10}
            className="flex-1 w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] opacity-80 leading-relaxed focus:outline-none focus:border-[var(--muted)]/40 resize-y min-h-[200px]"
          />

          <div className="flex items-center justify-between mt-2 mb-4">
            <span className="text-[10px] text-[var(--muted)] opacity-40">{editedContent.length} characters</span>
            {deliveryTarget && (
              <span className="text-[10px] text-[var(--muted)] opacity-40">
                Will send via {deliveryChannel} to {deliveryTarget}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleApprove}
              disabled={loadingAction !== null}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                hasEdits
                  ? "bg-amber-500 text-[#0a0a0a] hover:bg-amber-400"
                  : "bg-[#00ff88] text-[#0a0a0a] hover:bg-[#00dd77]"
              )}
            >
              {loadingAction === "approve" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {isSaved ? "Send Now" : hasEdits ? "Edit & Approve" : "Approve & Send Now"}
            </button>

            {!isSaved && (
              <button
                onClick={handleSaveDraft}
                disabled={loadingAction !== null}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAction === "save" ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save Draft
              </button>
            )}

            <button
              onClick={handleReject}
              disabled={loadingAction !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
            >
              {loadingAction === "reject" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              Reject & Regenerate
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
