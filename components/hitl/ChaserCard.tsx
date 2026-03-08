"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Check, X, Loader2, Clock, User, FileText, RotateCcw,
  ChevronDown, ChevronUp, Mail, Phone, Send, Save,
  AlertTriangle, MessageSquare, Zap,
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

const TONE_OPTIONS = ["gentle", "neutral", "firm", "urgent"] as const;
type Tone = (typeof TONE_OPTIONS)[number];

const QUICK_CHIPS = [
  "Too long — make it shorter",
  "More urgent",
  "Add the deadline date",
  "More personal",
  "Change tone to firm",
] as const;

export default function ChaserCard({ chaser, memories, onActionComplete }: ChaserCardProps) {
  const { id, script_id: scriptId, client, script, hitl_state: hitlState } = chaser;
  const [editedContent, setEditedContent] = useState(chaser.draft_content);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [result, setResult] = useState<{ action: string; success: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  // Regeneration state
  const [instruction, setInstruction] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [previousDraft, setPreviousDraft] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState<string | null>(null);

  // Tone state
  const initialTone = (hitlState?.tone_recommendation as Tone) ?? "neutral";
  const [selectedTone, setSelectedTone] = useState<Tone>(initialTone);

  // Channel state
  const [selectedChannel, setSelectedChannel] = useState<"email" | "whatsapp" | "both">(
    (client.preferred_channel === "whatsapp" || client.preferred_channel === "both")
      ? client.preferred_channel as "email" | "whatsapp" | "both"
      : "email"
  );

  const isSaved = chaser.status === "draft_saved";
  const hasEdits = editedContent !== chaser.draft_content;
  const scores = hitlState?.critique_scores;
  const daysSinceSent = script.sent_at
    ? Math.round((Date.now() - new Date(script.sent_at).getTime()) / 86400000)
    : null;

  // Side-by-side comparison active
  const comparing = previousDraft !== null && newDraft !== null;

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

  async function handleRegenerate(instructionText?: string) {
    const text = instructionText ?? instruction;
    if (!text && selectedTone === initialTone) return;

    setRegenerating(true);
    setPreviousDraft(editedContent);
    setNewDraft(null);

    try {
      const res = await fetch(`/api/hitl/${id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: text || undefined,
          tone: selectedTone !== initialTone ? selectedTone : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast("error", data.error ?? "Regeneration failed");
        setPreviousDraft(null);
        return;
      }

      const data = await res.json();
      setNewDraft(data.draft_content);
      if (data.email_subject) setNewSubject(data.email_subject);
      setInstruction("");
    } catch {
      toast("error", "Failed to regenerate");
      setPreviousDraft(null);
    } finally {
      setRegenerating(false);
    }
  }

  function pickDraft(version: "old" | "new") {
    if (version === "new" && newDraft) {
      setEditedContent(newDraft);
      debouncedSave(newDraft);
      toast("success", "New draft selected");
    } else {
      toast("info", "Kept original draft");
    }
    setPreviousDraft(null);
    setNewDraft(null);
    setNewSubject(null);
  }

  async function handleApprove() {
    setLoadingAction("approve");
    try {
      const res = await fetch(`/api/hitl/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editedContent: hasEdits ? editedContent : undefined,
          channel: selectedChannel,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult({ action: hasEdits ? "edited" : "approved", success: true });
      if (data.warning) {
        toast("info", data.warning);
      } else {
        toast("success", hasEdits ? "Edited draft sent" : "Draft approved and sent");
      }
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

  async function handleLegacyRegenerate() {
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
              onClick={handleLegacyRegenerate}
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
  const chaserLabel = chaser.chaser_count > 0 ? `Chaser #${chaser.chaser_count + 1}` : "First chaser";
  const approvalRate = client.total_scripts > 0
    ? Math.round((client.approved_count / client.total_scripts) * 100)
    : null;

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

      {/* Client Risk Panel */}
      <div className="px-6 py-3 bg-amber-500/5 border-b border-amber-500/10">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-amber-400" />
            <span className="text-[11px] font-medium text-amber-400">{chaserLabel}</span>
          </div>
          {daysSinceSent !== null && (
            <span className="text-[11px] text-[var(--muted)]">
              <span className="text-red-400 font-medium">{daysSinceSent}d</span> since sent
            </span>
          )}
          {client.avg_response_hours != null && (
            <span className="text-[11px] text-[var(--muted)]">
              Avg response: <span className="text-[var(--text)] font-medium">{Math.round(client.avg_response_hours)}hrs</span>
            </span>
          )}
          {approvalRate !== null && (
            <span className="text-[11px] text-[var(--muted)]">
              Approval rate: <span className={cn("font-medium", approvalRate >= 70 ? "text-emerald-400" : approvalRate >= 40 ? "text-amber-400" : "text-red-400")}>{approvalRate}%</span>
            </span>
          )}
          {client.changes_requested_count > 0 && (
            <span className="text-[11px] text-[var(--muted)]">
              Changes requested: <span className="text-amber-400 font-medium">{client.changes_requested_count}x</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
        {/* Left: Context */}
        <div className="p-6 space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Script Content</p>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3">
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
              {script.assigned_writer && (
                <div className="text-[11px] text-[var(--muted)]">Writer: {script.assigned_writer}</div>
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
                    <div key={key} className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded px-3 py-1.5">
                      <span className="text-[11px] text-[var(--muted)]">{label}</span>
                      <span className={cn("text-xs font-medium", num >= 8 ? "text-[var(--accent-success)]" : num >= 5 ? "text-amber-400" : "text-red-400")}>
                        {num}/10
                      </span>
                    </div>
                  );
                })}
                {scores.average != null && (
                  <div className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded px-3 py-1.5 col-span-2">
                    <span className="text-[11px] text-[var(--muted)]">Average</span>
                    <span className={cn("text-xs font-semibold", scores.average >= 8 ? "text-[var(--accent-success)]" : scores.average >= 5 ? "text-amber-400" : "text-red-400")}>
                      {scores.average.toFixed(1)}/10
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Draft + Controls */}
        <div className="p-6 flex flex-col">
          {/* Tone Selector */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Tone</p>
            <div className="flex gap-1.5">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setSelectedTone(t);
                    if (t !== selectedTone) {
                      handleRegenerate(`Rewrite with ${t} tone`);
                    }
                  }}
                  disabled={regenerating}
                  className={cn(
                    "px-3 py-1.5 rounded text-[11px] font-medium capitalize transition-colors disabled:opacity-40",
                    selectedTone === t
                      ? "border border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                      : "bg-[var(--surface-elevated)] text-[var(--text)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Draft label */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50">
              {isSaved ? "Saved Draft" : hasEdits ? "Edited Draft" : "AI-Generated Draft"}
            </p>
            {saving && <span className="text-[10px] text-[var(--muted)] animate-pulse">Saving...</span>}
            {regenerating && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                <Loader2 size={10} className="animate-spin" />
                Regenerating...
              </span>
            )}
          </div>

          {hitlState?.email_subject && !comparing && (
            <div className="mb-3">
              <p className="text-[10px] text-[var(--muted)] opacity-50 mb-0.5">Subject</p>
              <p className="text-sm text-[var(--text)] opacity-80">{newSubject ?? (hitlState.email_subject as string)}</p>
            </div>
          )}

          {/* Side-by-side comparison OR single draft */}
          {comparing ? (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex flex-col">
                <p className="text-[10px] uppercase text-[var(--muted)] opacity-50 mb-1">Previous</p>
                <div className="flex-1 px-3 py-2.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-xs text-[var(--text)] opacity-70 leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[400px]">
                  {previousDraft}
                </div>
                <button
                  onClick={() => pickDraft("old")}
                  className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)]"
                >
                  <RotateCcw size={10} />
                  Keep original
                </button>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] uppercase text-emerald-400 opacity-80 mb-1">New version</p>
                <div className="flex-1 px-3 py-2.5 bg-[var(--input-bg)] border border-emerald-500/30 rounded-lg text-xs text-[var(--text)] opacity-80 leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[400px]">
                  {newDraft}
                </div>
                <button
                  onClick={() => pickDraft("new")}
                  className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                >
                  <Check size={10} />
                  Use this version
                </button>
              </div>
            </div>
          ) : (
            <textarea
              value={editedContent}
              onChange={(e) => handleEditChange(e.target.value)}
              rows={12}
              className="flex-1 w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] opacity-90 leading-relaxed focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] resize-y min-h-[280px]"
            />
          )}

          {/* Quick feedback chips */}
          {!comparing && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setInstruction(chip);
                    handleRegenerate(chip);
                  }}
                  disabled={regenerating}
                  className="px-2.5 py-1 rounded-full text-[10px] bg-[var(--surface-elevated)] text-[var(--text)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] border border-[var(--border)] transition-colors disabled:opacity-30"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Instruction input */}
          {!comparing && (
            <div className="flex gap-2 mt-3">
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && instruction.trim()) {
                    handleRegenerate();
                  }
                }}
                placeholder="Tell the agent what to change..."
                className="flex-1 px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
              <button
                onClick={() => handleRegenerate()}
                disabled={regenerating || !instruction.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)] disabled:opacity-30"
              >
                {regenerating ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                Regenerate
              </button>
            </div>
          )}

          {/* Send Channel Selector */}
          <div className="mt-4 mb-3">
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Send via</p>
            <div className="flex gap-1.5">
              {(["email", "whatsapp", "both"] as const).map((ch) => {
                const disabled =
                  (ch === "whatsapp" && !client.whatsapp_number) ||
                  (ch === "email" && !client.email) ||
                  (ch === "both" && (!client.email || !client.whatsapp_number));
                return (
                  <button
                    key={ch}
                    onClick={() => !disabled && setSelectedChannel(ch)}
                    disabled={disabled}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium capitalize transition-colors",
                      selectedChannel === ch
                        ? "border border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                        : "bg-[var(--surface-elevated)] text-[var(--text)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)]",
                      disabled && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    {ch === "email" && <Mail size={10} />}
                    {ch === "whatsapp" && <MessageSquare size={10} />}
                    {ch === "both" && <><Mail size={10} /><MessageSquare size={10} /></>}
                    {ch}
                  </button>
                );
              })}
            </div>
            {client.whatsapp_number && client.email && client.avg_response_hours != null && (
              <p className="text-[10px] text-[var(--muted)] opacity-50 mt-1.5">
                {client.name} usually responds in ~{Math.round(client.avg_response_hours)}hrs
              </p>
            )}
          </div>

          {/* Character count */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-[var(--muted)] opacity-40">{editedContent.length} characters</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleApprove}
              disabled={loadingAction !== null || comparing}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                hasEdits
                  ? "bg-amber-500 text-white hover:bg-amber-400"
                  : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 glow-primary"
              )}
            >
              {loadingAction === "approve" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {isSaved ? "Send Now" : hasEdits ? "Edit & Approve" : "Approve & Send Now"}
            </button>

            {!isSaved && (
              <button
                onClick={handleSaveDraft}
                disabled={loadingAction !== null || comparing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAction === "save" ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save Draft
              </button>
            )}

            <button
              onClick={handleReject}
              disabled={loadingAction !== null || comparing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
            >
              {loadingAction === "reject" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              Reject
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
