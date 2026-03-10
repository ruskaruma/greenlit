import type { ScriptStatus } from "@/lib/supabase/types";

/**
 * Simple email validation — catches obviously invalid input.
 * Not RFC-5322 compliant, but sufficient for form validation.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/**
 * Valid status transitions for scripts.
 * Key = current status, Value = array of statuses it can move to.
 */
const VALID_TRANSITIONS: Record<ScriptStatus, ScriptStatus[]> = {
  draft: ["pending_review"],
  pending_review: ["approved", "rejected", "changes_requested", "overdue"],
  changes_requested: ["pending_review"],
  approved: ["closed"],
  rejected: ["pending_review", "draft"],
  overdue: ["pending_review"],
  closed: ["draft"],
};

export function isValidStatusTransition(
  from: ScriptStatus,
  to: ScriptStatus
): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}
