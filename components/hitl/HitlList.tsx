"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot } from "lucide-react";
import ChaserCard from "./ChaserCard";
import ToastProvider from "@/components/ui/ToastProvider";
import type { ChaserData } from "@/app/hitl/page";

interface HitlListProps {
  initialChasers: ChaserData[];
  memories: Record<string, { content: string; memory_type: string; created_at: string }[]>;
}

export default function HitlList({ initialChasers, memories }: HitlListProps) {
  const [chasers, setChasers] = useState(initialChasers);
  const router = useRouter();

  function handleActionComplete(id: string) {
    setChasers((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  if (chasers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center mb-4">
          <Bot size={20} className="text-[var(--muted)]" />
        </div>
        <p className="text-sm text-[var(--muted)] mb-1">No drafts pending approval</p>
        <p className="text-xs text-[var(--muted)] opacity-60 mb-4 text-center max-w-xs">
          Run the agent on an overdue script to generate a chase draft
        </p>
        <Link
          href="/dashboard"
          className="text-xs text-[var(--text)] border border-[var(--border)] px-3 py-1.5 rounded hover:bg-[var(--surface-elevated)]"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="space-y-6">
        {chasers.map((chaser) => (
          <ChaserCard
            key={chaser.id}
            chaser={chaser}
            memories={memories[chaser.client_id] ?? []}
            onActionComplete={() => handleActionComplete(chaser.id)}
          />
        ))}
      </div>
    </ToastProvider>
  );
}
