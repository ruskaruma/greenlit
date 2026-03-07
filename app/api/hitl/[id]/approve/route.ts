import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";
import { sendChaserEmail } from "@/lib/resend/sendChaserEmail";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const { id } = await params;
  const supabase: SupabaseAny = createServiceClientDirect();
  const body = await request.json();

  const { editedContent } = body as { editedContent?: string };

  // Fetch chaser with relations
  const { data: chaser, error: fetchError } = await supabase
    .from("chasers")
    .select("id, script_id, client_id, draft_content, status, hitl_state, clients(name, email), scripts(title)")
    .eq("id", id)
    .single();

  if (fetchError || !chaser) {
    return NextResponse.json({ error: "Chaser not found" }, { status: 404 });
  }

  if (chaser.status !== "pending_hitl") {
    return NextResponse.json(
      { error: `Chaser already ${chaser.status}` },
      { status: 409 }
    );
  }

  const wasEdited = editedContent && editedContent !== chaser.draft_content;
  const finalContent = editedContent ?? chaser.draft_content;
  const newStatus = wasEdited ? "edited" : "approved";

  // Send email FIRST — only update status on success
  const clientEmail = chaser.clients?.email;
  const clientName = chaser.clients?.name ?? "there";
  const fallbackSubject = `Following up: ${chaser.scripts?.title}`;

  if (clientEmail) {
    const emailResult = await sendChaserEmail(clientEmail, finalContent, fallbackSubject, clientName);
    if (!emailResult.success) {
      console.error("[hitl/approve] Email send failed:", emailResult.error);
      return NextResponse.json(
        { error: `Email delivery failed: ${emailResult.error}` },
        { status: 500 }
      );
    }
  }

  // Email succeeded — now update chaser status to sent
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    sent_at: new Date().toISOString(),
  };
  if (wasEdited) {
    updatePayload.team_lead_edits = editedContent;
  }

  const { error: updateError } = await supabase
    .from("chasers")
    .update(updatePayload)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit log
  await supabase.from("audit_log").insert({
    entity_type: "chaser",
    entity_id: id,
    action: `chaser_${newStatus}`,
    actor: "team_lead",
    metadata: {
      script_id: chaser.script_id,
      was_edited: wasEdited,
    },
  });

  return NextResponse.json({ success: true, status: newStatus });
}
