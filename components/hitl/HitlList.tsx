"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot } from "lucide-react";
import ChaserCard from "./ChaserCard";
import ToastProvider from "@/components/ui/ToastProvider";

interface ChaserData {
  id: string;
  script_id: string;
  draft_content: string;
  created_at: string;
  hitl_state: {
    email_subject?: string;
    hours_overdue?: number;
    client_email?: string;
  } | null;
  client: { name: string; company: string | null };
  script: { title: string };
}

interface HitlListProps {
  initialChasers: ChaserData[];
}

export default function HitlList({ initialChasers }: HitlListProps) {
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
    <div className="space-y-4">
      {chasers.map((chaser) => (
        <ChaserCard
          key={chaser.id}
          id={chaser.id}
          scriptId={chaser.script_id}
          clientName={chaser.client.name}
          clientCompany={chaser.client.company}
          scriptTitle={chaser.script.title}
          hoursOverdue={chaser.hitl_state?.hours_overdue ?? 0}
          emailSubject={chaser.hitl_state?.email_subject ?? "Follow-up"}
          draftContent={chaser.draft_content}
          createdAt={chaser.created_at}
          onActionComplete={() => handleActionComplete(chaser.id)}
        />
      ))}
    </div>
    </ToastProvider>
  );
}
