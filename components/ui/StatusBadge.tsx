"use client";

import { cn } from "@/lib/utils";
import { getStatusColor, formatStatus } from "@/lib/utils";
import type { ScriptStatus } from "@/lib/supabase/types";

interface StatusBadgeProps {
  status: ScriptStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const isOverdueStatus = status === "overdue";

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
        getStatusColor(status),
        isOverdueStatus && "animate-pulse-subtle",
        className
      )}
    >
      {formatStatus(status)}
    </span>
  );
}
