"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, AlertTriangle, X } from "lucide-react";
import AgentTracePanel from "./AgentTracePanel";
import { useToast } from "@/components/ui/ToastProvider";
import { isOverdue } from "@/lib/utils";
import type { ScriptStatus } from "@/lib/supabase/types";

interface RunAgentButtonProps {
  scripts: { id: string; title: string; status: ScriptStatus; sent_at: string | null }[];
}

export default function RunAgentButton({ scripts }: RunAgentButtonProps) {
  const [activeScript, setActiveScript] = useState<{ id: string; title: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingScript, setPendingScript] = useState<{ id: string; title: string } | null>(null);
  const { toast } = useToast();

  const overdueScripts = scripts.filter((s) => isOverdue(s.sent_at, s.status));
  const hasOverdue = overdueScripts.length > 0;

  if (!hasOverdue && !activeScript) {
    return (
      <div className="relative group">
        <button
          disabled
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-[var(--muted)] border border-[var(--border)] opacity-40 cursor-not-allowed"
          title="No overdue scripts to chase"
        >
          <Bot size={13} />
          Run Agent
        </button>
      </div>
    );
  }

  function handleRunClick() {
    const first = overdueScripts[0];
    if (first) {
      setPendingScript({ id: first.id, title: first.title });
      setConfirmOpen(true);
    }
  }

  async function handleConfirm() {
    if (!pendingScript) return;

    // Check for duplicate before launching trace panel
    try {
      const res = await fetch(`/api/agent/trigger/${pendingScript.id}`, { method: "POST" });
      if (res.status === 409) {
        toast("info", "Draft already exists in HITL panel");
        setConfirmOpen(false);
        setPendingScript(null);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        toast("error", data.error || "Failed to trigger agent");
        setConfirmOpen(false);
        setPendingScript(null);
        return;
      }
      toast("success", "Agent triggered — check HITL panel for draft");
    } catch {
      toast("error", "Failed to trigger agent");
    }

    setConfirmOpen(false);
    setPendingScript(null);
  }

  return (
    <>
      {!activeScript && (
        <div className="relative group">
          <button
            onClick={handleRunClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text)]"
          >
            <Bot size={13} />
            Run Agent
          </button>
        </div>
      )}

      {/* Confirmation dialog */}
      <AnimatePresence>
        {confirmOpen && pendingScript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-xl p-6"
            >
              <button
                onClick={() => setConfirmOpen(false)}
                className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X size={14} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">Run Chase Agent</h3>
                  <p className="text-[11px] text-[var(--muted)]">This will generate a follow-up email</p>
                </div>
              </div>

              <p className="text-xs text-[var(--muted)] mb-1">Target script:</p>
              <p className="text-sm text-[var(--text)] mb-4 font-medium">{pendingScript.title}</p>

              <p className="text-[11px] text-[var(--muted)] opacity-60 mb-4">
                The agent will analyze the client history and generate a chase email draft. You can review it in the HITL panel before sending.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 px-4 py-2 rounded text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-medium bg-[var(--text)] text-[var(--bg)] hover:opacity-80"
                >
                  <Bot size={12} />
                  Confirm & Run
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent trace panel */}
      <AnimatePresence>
        {activeScript && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
            <div className="w-full max-w-lg">
              <AgentTracePanel
                scriptId={activeScript.id}
                scriptTitle={activeScript.title}
                onClose={() => setActiveScript(null)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
