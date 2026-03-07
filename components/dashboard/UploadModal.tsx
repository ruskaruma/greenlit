"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Upload, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/supabase/types";

type ToastState = { type: "success" | "error"; message: string } | null;

function Toast({ toast, onDismiss }: { toast: NonNullable<ToastState>; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        "fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium z-[60] border",
        toast.type === "success"
          ? "bg-[var(--card)] text-[var(--text)] border-emerald-500/20"
          : "bg-[var(--card)] text-red-400 border-red-500/20"
      )}
    >
      {toast.message}
    </motion.div>
  );
}

export default function UploadModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchClients();
  }, [isOpen, fetchClients]);

  function resetForm() {
    setTitle("");
    setClientId("");
    setContent("");
    setDueDate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !clientId || !content) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          client_id: clientId,
          due_date: dueDate || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create script");
      }

      setIsOpen(false);
      resetForm();
      setToast({ type: "success", message: "Script sent for review" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setToast({ type: "error", message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-1.5 rounded-[4px] bg-[var(--text)] text-[var(--bg)] text-xs font-semibold hover:opacity-80"
      >
        <Upload size={14} />
        Upload Script
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
                <h2 className="text-base font-semibold text-[var(--text)]">Upload Script</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label htmlFor="title" className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                    Script Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="e.g. Summer Campaign - Hero Video"
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[#333333] transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="client" className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                    Client
                  </label>
                  <select
                    id="client"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:border-[#333333] transition-colors"
                  >
                    <option value="" disabled>
                      Select a client
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.company ? ` (${c.company})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="content" className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                    Script Content
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={8}
                    placeholder="Paste your script here..."
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[#333333] transition-colors resize-y min-h-[200px]"
                  />
                </div>

                <div>
                  <label htmlFor="due_date" className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                    Due Date
                  </label>
                  <input
                    id="due_date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:border-[#333333] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !title || !clientId || !content}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[4px] bg-[var(--text)] text-[var(--bg)] text-sm font-semibold hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Send for Review
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </>
  );
}
