import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";
import type { ScriptStatus } from "@/lib/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

// NOTE: Supabase Realtime must have UPDATE events enabled on the scripts table
// publication for KanbanBoard to receive changes. As a fallback, ScriptDetailSheet
// does an optimistic state update via onStatusChange callback.
const validStatuses: ScriptStatus[] = [
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "rejected",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireSession();
  if (authError) return authError;

  const { id } = await params;
  const { status } = (await request.json()) as { status: ScriptStatus };

  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase: SupabaseAny = createServiceClientDirect();

  // Fetch current status for audit trail
  const { data: current, error: fetchError } = await supabase
    .from("scripts")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  const oldStatus = current.status;

  const { error } = await supabase
    .from("scripts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log with old→new status and actor email
  await supabase.from("audit_log").insert({
    entity_type: "script",
    entity_id: id,
    action: "status_changed",
    actor: session?.user?.email ?? "team_lead",
    metadata: { from: oldStatus, to: status },
  });

  return NextResponse.json({ success: true, status });
}
