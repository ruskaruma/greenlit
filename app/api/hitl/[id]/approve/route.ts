import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";
import { sendChaserEmail } from "@/lib/resend/sendChaserEmail";
import { storeClientMemory, buildChaserSentMemory } from "@/lib/agent/nodes/memoryUpdate";

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

  const { editedContent, saveOnly } = body as { editedContent?: string; saveOnly?: boolean };

  const { data: chaser, error: fetchError } = await supabase
    .from("chasers")
    .select("id, script_id, client_id, draft_content, status, hitl_state, clients(name, email, company), scripts(title, platform, sent_at)")
    .eq("id", id)
    .single();

  if (fetchError || !chaser) {
    return NextResponse.json({ error: "Chaser not found" }, { status: 404 });
  }

  if (chaser.status !== "pending_hitl" && chaser.status !== "draft_saved") {
    return NextResponse.json(
      { error: `Chaser already ${chaser.status}` },
      { status: 409 }
    );
  }

  const wasEdited = editedContent != null && editedContent !== chaser.draft_content;
  const finalContent = editedContent ?? chaser.draft_content;

  if (saveOnly) {
    const savePayload: Record<string, unknown> = {
      status: "draft_saved",
      draft_content: finalContent,
    };
    if (wasEdited) {
      savePayload.team_lead_edits = editedContent;
    }

    await supabase.from("chasers").update(savePayload).eq("id", id);

    await supabase.from("audit_log").insert({
      entity_type: "chaser",
      entity_id: id,
      action: "chaser_saved",
      actor: "team_lead",
      metadata: { script_id: chaser.script_id },
    });

    return NextResponse.json({ success: true, status: "draft_saved" });
  }

  const newStatus = wasEdited ? "edited" : "approved";
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

  await supabase.from("audit_log").insert({
    entity_type: "chaser",
    entity_id: id,
    action: `chaser_${newStatus}`,
    actor: "team_lead",
    metadata: { script_id: chaser.script_id, was_edited: wasEdited },
  });

  const sentAt = chaser.scripts?.sent_at;
  const daysOverdue = sentAt
    ? Math.round((Date.now() - new Date(sentAt).getTime()) / 86400000)
    : 0;

  const critiqueScores = chaser.hitl_state?.critique_scores as
    | { professionalism?: number; personalization?: number }
    | null
    | undefined;

  storeClientMemory(
    chaser.client_id,
    buildChaserSentMemory({
      clientName,
      brand: chaser.clients?.company ?? null,
      scriptTitle: chaser.scripts?.title ?? "Unknown",
      platform: chaser.scripts?.platform ?? null,
      daysOverdue,
      critiqueScores,
      wasEdited,
    }),
    "chaser_sent",
    { chaser_id: id, script_id: chaser.script_id }
  ).catch((err: unknown) => console.error("[hitl/approve] Memory storage failed:", err));

  return NextResponse.json({ success: true, status: newStatus });
}
