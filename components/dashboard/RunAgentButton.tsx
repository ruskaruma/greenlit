"use client";

import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, X, Loader2, CheckCircle, Circle } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { isOverdue, getScriptAge } from "@/lib/utils";
import type { ScriptStatus } from "@/lib/supabase/types";

interface OverdueScript {
  id: string;
  title: string;
  status: ScriptStatus;
  sent_at: string | null;
  client_name?: string;
  due_date?: string | null;
}

interface RunAgentButtonProps {
  scripts: { id: string; title: string; status: ScriptStatus; sent_at: string | null; client_name?: string; due_date?: string | null }[];
}

interface StreamEvent {
  node: string;
  status: "started" | "completed" | "error";
  timestamp: string;
  data?: Record<string, unknown>;
}

const NODE_LABELS: Record<string, string> = {
  ragRetrieval: "Retrieving client memory...",
  sentimentAnalysis: "Analysing sentiment...",
  generation: "Generating draft...",
  selfCritique: "Running self-critique...",
  revision: "Revising draft...",
};

export default function RunAgentButton({ scripts }: RunAgentButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { toast } = useToast();

  const overdueScripts: OverdueScript[] = scripts
    .filter((s) => isOverdue(s.sent_at, s.status) || s.status === "overdue")
    .sort((a, b) => {
      const ageA = a.sent_at ? getScriptAge(a.sent_at) : 0;
      const ageB = b.sent_at ? getScriptAge(b.sent_at) : 0;
      return ageB - ageA;
    });

  const hasOverdue = overdueScripts.length > 0;
  const selected = overdueScripts.find((s) => s.id === selectedId) ?? overdueScripts[0] ?? null;

  function openConfirm() {
    if (!hasOverdue) return;
    setSelectedId(overdueScripts[0]?.id ?? null);
    setConfirmOpen(true);
    setRunning(false);
    setDone(false);
    setCurrentNode(null);
    setCompletedNodes([]);
  }

  const runAgent = useCallback(async () => {
    if (!selected) return;

    try {
      const triggerRes = await fetch(`/api/agent/trigger/${selected.id}`, { method: "POST" });
      if (triggerRes.status === 409) {
        toast("info", "Draft already exists in HITL panel");
        setConfirmOpen(false);
        return;
      }
      if (!triggerRes.ok) {
        const data = await triggerRes.json();
        toast("error", data.error || "Failed to trigger agent");
        setConfirmOpen(false);
        return;
      }
    } catch {
      toast("error", "Failed to trigger agent");
      setConfirmOpen(false);
      return;
    }

    setRunning(true);
    setCurrentNode(null);
    setCompletedNodes([]);
    setDone(false);

    const es = new EventSource(`/api/agent/stream/${selected.id}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: StreamEvent = JSON.parse(e.data);
        if (event.node === "done") {
          setRunning(false);
          setDone(true);
          es.close();
          toast("success", "Draft ready — check HITL panel");
          return;
        }
        if (event.node === "result") {
          setRunning(false);
          setDone(true);
          es.close();
          if (event.status === "error") {
            toast("error", `Agent error: ${event.data?.error ?? "unknown"}`);
          } else {
            toast("success", "Draft ready — check HITL panel");
          }
          return;
        }
        if (event.node !== "pipeline" && NODE_LABELS[event.node]) {
          if (event.status === "started") {
            setCurrentNode(event.node);
          }
          if (event.status === "completed") {
            setCompletedNodes((prev) => [...prev, event.node]);
            setCurrentNode(null);
          }
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      setRunning(false);
      setDone(true);
      es.close();
    };
  }, [selected, toast]);

  function close() {
    eventSourceRef.current?.close();
    setConfirmOpen(false);
    setRunning(false);
  }

  const daysOverdue = selected?.sent_at ? Math.round(getScriptAge(selected.sent_at) / 24) : 0;

  return (
    <>
      <div className="relative group">
        <button
          onClick={openConfirm}
          disabled={!hasOverdue}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-[var(--border)] ${
            hasOverdue
              ? "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text)]"
              : "text-[var(--muted)] opacity-40 cursor-not-allowed"
          }`}
          title={hasOverdue ? undefined : "No overdue scripts right now"}
        >
          <Bot size={13} />
          Run Agent
        </button>
      </div>

      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text)]">Run Chase Agent</h3>
                <button onClick={close} className="text-[var(--muted)] hover:text-[var(--text)]">
                  <X size={14} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {!running && !done && selected && (
                  <>
                    {overdueScripts.length > 1 && (
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-1.5">Select script</label>
                        <select
                          value={selectedId ?? selected.id}
                          onChange={(e) => setSelectedId(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none"
                        >
                          {overdueScripts.map((s) => {
                            const days = s.sent_at ? Math.round(getScriptAge(s.sent_at) / 24) : 0;
                            return (
                              <option key={s.id} value={s.id}>
                                {s.title} ({days}d overdue)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    <div className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-4">
                      <p className="text-sm font-medium text-[var(--text)] mb-1">{selected.title}</p>
                      {selected.client_name && (
                        <p className="text-xs text-[var(--muted)] mb-1">Client: {selected.client_name}</p>
                      )}
                      <p className="text-xs text-red-400 mb-1">{daysOverdue} days past deadline</p>
                      {selected.due_date && (
                        <p className="text-xs text-[var(--muted)] opacity-60">
                          Due: {new Date(selected.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                      Claude will analyse {selected.client_name ? `${selected.client_name}'s` : "the client's"} approval history and generate a personalised follow-up message for your review before anything is sent.
                    </p>
                  </>
                )}

                {(running || done) && (
                  <div className="space-y-2">
                    {Object.entries(NODE_LABELS).map(([key, label]) => {
                      const isCompleted = completedNodes.includes(key);
                      const isCurrent = currentNode === key;
                      return (
                        <div key={key} className="flex items-center gap-2.5">
                          {isCompleted ? (
                            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                          ) : isCurrent ? (
                            <Loader2 size={14} className="text-amber-400 animate-spin shrink-0" />
                          ) : (
                            <Circle size={14} className="text-[var(--muted)] opacity-30 shrink-0" />
                          )}
                          <span className={`text-xs ${
                            isCompleted ? "text-[var(--text)] opacity-60" :
                            isCurrent ? "text-amber-400 font-medium" :
                            "text-[var(--muted)] opacity-30"
                          }`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                    {done && (
                      <p className="text-xs text-emerald-400 font-medium pt-2">Draft ready in HITL panel</p>
                    )}
                  </div>
                )}
              </div>

              {!running && !done && (
                <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)]">
                  <button
                    onClick={close}
                    className="flex-1 px-4 py-2 rounded text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={runAgent}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-medium bg-[var(--text)] text-[var(--bg)] hover:opacity-80"
                  >
                    <Bot size={12} />
                    Run Agent
                  </button>
                </div>
              )}

              {done && (
                <div className="px-5 py-4 border-t border-[var(--border)]">
                  <button
                    onClick={close}
                    className="w-full px-4 py-2 rounded text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
