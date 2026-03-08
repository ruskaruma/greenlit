import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import type { ScriptStatus } from "@/lib/supabase/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getScriptAge(sentAt: string): number {
  return differenceInHours(new Date(), new Date(sentAt));
}

export function isOverdue(sentAt: string | null, status: ScriptStatus, responseDeadlineMinutes?: number): boolean {
  if (!sentAt) return false;
  if (status === "approved" || status === "rejected" || status === "draft" || status === "closed") return false;
  const deadlineMinutes = responseDeadlineMinutes ?? 2880; // default 48 hours
  const deadlineHours = deadlineMinutes / 60;
  return getScriptAge(sentAt) > deadlineHours;
}

export function getStatusColor(status: ScriptStatus): string {
  switch (status) {
    case "pending_review":
      return "bg-amber-500/15 text-amber-400 dark:text-amber-300 border-amber-500/20";
    case "approved":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "rejected":
      return "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/15";
    case "overdue":
      return "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/15";
    case "changes_requested":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/15";
    case "draft":
      return "bg-[var(--text)]/5 text-[var(--muted)] border-[var(--text)]/5";
    case "closed":
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/15";
    default:
      return "bg-[var(--text)]/5 text-[var(--muted)] border-[var(--text)]/5";
  }
}

export function formatTimeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getChaseCountdown(sentAt: string | null, responseDeadlineMinutes?: number): string | null {
  if (!sentAt) return null;
  const deadlineMinutes = responseDeadlineMinutes ?? 2880;
  const sentTime = new Date(sentAt).getTime();
  const deadlineTime = sentTime + deadlineMinutes * 60 * 1000;
  const remainingMs = deadlineTime - Date.now();

  if (remainingMs <= 0) return null; // already overdue

  const remainingMinutes = Math.round(remainingMs / (60 * 1000));
  if (remainingMinutes < 60) return `Chase in ${remainingMinutes}m`;
  const remainingHours = Math.round(remainingMinutes / 60);
  if (remainingHours < 24) return `Chase in ${remainingHours}h`;
  const remainingDays = Math.round(remainingHours / 24);
  return `Chase in ${remainingDays}d`;
}

export function formatStatus(status: ScriptStatus): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
