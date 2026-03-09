"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Upload, FileEdit, Search } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { createClient } from "@/lib/supabase/client";
import ScriptCard from "./ScriptCard";
import ScriptDetailSheet from "./ScriptDetailSheet";
import RunAgentButton from "./RunAgentButton";
import { isOverdue } from "@/lib/utils";
import type { ScriptWithClient, Script, ScriptStatus } from "@/lib/supabase/types";

type ColumnKey = "draft" | "pending_review" | "changes_requested" | "approved" | "overdue" | "rejected";

const columns: { key: ColumnKey; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "pending_review", label: "Pending Review" },
  { key: "changes_requested", label: "Changes Requested" },
  { key: "approved", label: "Approved" },
  { key: "overdue", label: "Overdue" },
  { key: "rejected", label: "Rejected" },
];

const columnToStatus: Partial<Record<ColumnKey, ScriptStatus>> = {
  draft: "draft",
  pending_review: "pending_review",
  changes_requested: "changes_requested",
  approved: "approved",
  rejected: "rejected",
};

function categorizeScript(script: ScriptWithClient): ColumnKey | null {
  if (script.status === "closed") return null;
  if (script.status === "draft") return "draft";
  if (script.status === "overdue") return "overdue";
  if (isOverdue(script.sent_at, script.status, script.response_deadline_minutes)) return "overdue";
  if (script.status === "pending_review") return "pending_review";
  if (script.status === "changes_requested") return "changes_requested";
  if (script.status === "approved") return "approved";
  if (script.status === "rejected") return "rejected";
  return null;
}

interface KanbanBoardProps {
  initialScripts: ScriptWithClient[];
  onConnectionChange?: (connected: boolean) => void;
  refreshKey?: number;
  onArchive?: (id: string, archived: boolean) => void;
}

export default function KanbanBoard({ initialScripts, onConnectionChange, refreshKey, onArchive }: KanbanBoardProps) {
  const [scripts, setScripts] = useState<ScriptWithClient[]>(initialScripts);
  const [selectedScript, setSelectedScript] = useState<ScriptWithClient | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscribedRef = useRef(false);

  const handleStatusChange = useCallback((scriptId: string, newStatus: ScriptStatus) => {
    setScripts((prev) => prev.map((s) => (s.id === scriptId ? { ...s, status: newStatus } : s)));
    setSelectedScript((prev) => prev && prev.id === scriptId ? { ...prev, status: newStatus } : prev);
  }, []);

  useEffect(() => { setScripts(initialScripts); }, [initialScripts]);

  const fetchScripts = useCallback(async () => {
    try {
      const res = await fetch("/api/scripts");
      if (res.ok) setScripts(await res.json() as ScriptWithClient[]);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) fetchScripts();
  }, [refreshKey, fetchScripts]);

  const handleScriptChange = useCallback(
    (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const updated = payload.new as unknown as Script;
      setScripts((prev) => {
        if (payload.eventType === "DELETE") return prev.filter((s) => s.id !== (payload.old as { id: string }).id);
        const idx = prev.findIndex((s) => s.id === updated.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...updated }; return next; }
        if (payload.eventType === "INSERT") fetchScripts();
        return prev;
      });
    },
    [fetchScripts]
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("scripts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "scripts" }, handleScriptChange)
      .subscribe((status: string) => {
        const isSubscribed = status === "SUBSCRIBED";
        subscribedRef.current = isSubscribed;
        onConnectionChange?.(isSubscribed);
        if (!isSubscribed && !pollingRef.current) pollingRef.current = setInterval(fetchScripts, 10_000);
        if (isSubscribed && pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      });
    return () => {
      supabase.removeChannel(channel);
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [handleScriptChange, onConnectionChange, fetchScripts]);

  useEffect(() => {
    const interval = setInterval(() => setScripts((prev) => [...prev]), 60_000);
    return () => clearInterval(interval);
  }, []);

  const [agentScript, setAgentScript] = useState<{ id: string; title: string; client_name: string; due_date: string | null } | null>(null);

  const handleArchive = useCallback((id: string, archived: boolean) => {
    setScripts((prev) => prev.map((s) => s.id === id ? { ...s, archived } : s));
    onArchive?.(id, archived);
  }, [onArchive]);

  const visibleScripts = scripts.filter((s) => !s.archived && s.status !== "closed");

  const grouped = columns.reduce<Record<ColumnKey, ScriptWithClient[]>>(
    (acc, col) => { acc[col.key] = []; return acc; },
    {} as Record<ColumnKey, ScriptWithClient[]>
  );
  for (const script of visibleScripts) {
    const col = categorizeScript(script);
    if (col) grouped[col].push(script);
  }

  const onDragStart = useCallback(() => setIsDragging(true), []);

  const onDragEnd = useCallback(async (result: DropResult) => {
    setIsDragging(false);
    if (!result.destination) return;
    const destCol = result.destination.droppableId as ColumnKey;
    const newStatus = columnToStatus[destCol];
    if (!newStatus) return;

    const scriptId = result.draggableId;
    const script = visibleScripts.find((s) => s.id === scriptId);
    if (!script) return;

    const oldStatus = script.status;
    if (categorizeScript({ ...script, status: newStatus }) === categorizeScript(script)) return;

    handleStatusChange(scriptId, newStatus);
    try {
      const res = await fetch(`/api/scripts/${scriptId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) handleStatusChange(scriptId, oldStatus);
    } catch {
      handleStatusChange(scriptId, oldStatus);
    }
  }, [visibleScripts, handleStatusChange]);

  const emptyIcons: Record<string, React.ReactNode> = {
    draft: <FileEdit size={14} className="text-[var(--muted)] opacity-40" />,
    pending_review: <Upload size={14} className="text-[var(--muted)] opacity-40" />,
  };

  const emptyLabels: Record<string, string> = {
    draft: "No drafts",
    pending_review: "No pending scripts",
  };

  return (
    <>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => (
            <div key={col.key} className="flex flex-col w-[280px] shrink-0">
              <div className="flex items-center gap-2.5 mb-3 px-1">
                <div className="w-1.5 h-1.5 rounded-sm bg-[var(--muted)] opacity-40" />
                <h2 className="text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">{col.label}</h2>
                <span className="ml-auto text-[10px] text-[var(--muted)] opacity-60 bg-[var(--surface-elevated)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                  {grouped[col.key].length}
                </span>
              </div>

              <Droppable droppableId={col.key} isDropDisabled={col.key === "overdue"}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col gap-2 min-h-[200px] rounded-lg p-2 border transition-colors ${
                      snapshot.isDraggingOver && col.key !== "overdue"
                        ? "bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/30"
                        : "bg-[var(--bg)]/50 border-[var(--border)]/50"
                    }`}
                  >
                    <AnimatePresence mode="popLayout">
                      {grouped[col.key].length === 0 && !snapshot.isDraggingOver ? (
                        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--border)] rounded-lg min-h-[200px] gap-2">
                          {emptyIcons[col.key] || <Plus size={14} className="text-[var(--muted)] opacity-40" />}
                          <p className="text-[11px] text-[var(--muted)] opacity-40">
                            {emptyLabels[col.key] || "No scripts here"}
                          </p>
                          {col.key === "overdue" && (
                            <p className="text-[9px] text-[var(--muted)] opacity-30 flex items-center gap-1">
                              <Search size={8} /> Auto-detected
                            </p>
                          )}
                        </div>
                      ) : (
                        grouped[col.key].map((script, index) => (
                          <Draggable key={script.id} draggableId={script.id} index={index}>
                            {(dragProvided) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                              >
                                <ScriptCard
                                  script={script}
                                  onClick={() => setSelectedScript(script)}
                                  onArchive={handleArchive}
                                  onStatusChange={handleStatusChange}
                                  onRunAgent={(s) => setAgentScript(s)}
                                  dragHandleProps={dragProvided.dragHandleProps}
                                  disableLayoutAnimation={isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                    </AnimatePresence>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <AnimatePresence>
        {selectedScript && (
          <ScriptDetailSheet
            script={selectedScript}
            onClose={() => setSelectedScript(null)}
            onStatusChange={handleStatusChange}
            onScriptUpdated={fetchScripts}
          />
        )}
      </AnimatePresence>

      {agentScript && (
        <RunAgentButton
          scripts={[]}
          mode="single"
          singleScript={agentScript}
          onOpenChange={(open) => { if (!open) setAgentScript(null); }}
          key={agentScript.id}
        />
      )}
    </>
  );
}
