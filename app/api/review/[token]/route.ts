import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { Resend } from "resend";
import { storeClientMemory, buildClientResponseMemory } from "@/lib/agent/nodes/memoryUpdate";
import type { ScriptStatus } from "@/lib/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function notifyTeam(
  clientName: string,
  action: string,
  scriptTitle: string,
  feedback: string | null
) {
  const teamEmail = process.env.ALLOWED_EMAIL;
  if (!teamEmail || !resend) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    await resend.emails.send({
      from: `Greenlit <${process.env.RESEND_FROM_EMAIL || "greenlit@ruskaruma.me"}>`,
      to: [teamEmail],
      subject: `[Greenlit] ${clientName} ${action} '${scriptTitle}' via email review`,
      text: `Client ${clientName} reviewed via magic link.\n\nDecision: ${action}\nFeedback: ${feedback || "none"}\n\nView in dashboard: ${appUrl}/dashboard`,
    });
  } catch (err) {
    console.error("[review] Team notification email failed:", err);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase: SupabaseAny = createServiceClientDirect();

  const { data, error } = await supabase
    .from("scripts")
    .select("*, client:clients(name, company)")
    .eq("review_token", token)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Script not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase: SupabaseAny = createServiceClientDirect();
  const body = await request.json();

  const { action, feedback } = body as {
    action: "approved" | "rejected" | "changes_requested";
    feedback?: string;
  };

  const validActions: ScriptStatus[] = ["approved", "rejected", "changes_requested"];
  if (!validActions.includes(action)) {
    return NextResponse.json(
      { error: "action must be approved, rejected, or changes_requested" },
      { status: 400 }
    );
  }

  // Fetch script to get client_id and verify token
  const { data: script, error: fetchError } = await supabase
    .from("scripts")
    .select("id, client_id, status, sent_at")
    .eq("review_token", token)
    .single();

  if (fetchError || !script) {
    return NextResponse.json(
      { error: "Script not found" },
      { status: 404 }
    );
  }

  // Part 5: Idempotency — prevent double-submit for all terminal review states
  if (script.status === "approved" || script.status === "rejected" || script.status === "changes_requested") {
    return NextResponse.json(
      { error: "already_reviewed", status: script.status },
      { status: 409 }
    );
  }

  const respondedAt = new Date();

  const { error: updateError } = await supabase
    .from("scripts")
    .update({
      status: action,
      client_feedback: feedback ?? null,
      reviewed_at: respondedAt.toISOString(),
    })
    .eq("id", script.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    entity_type: "script",
    entity_id: script.id,
    action: `client_${action}`,
    actor: `client:${script.client_id}`,
    metadata: { feedback: feedback ?? null, review_token: token },
  });

  // Update client stats + avg_response_hours
  const statField =
    action === "approved"
      ? "approved_count"
      : action === "rejected"
        ? "rejected_count"
        : "changes_requested_count";

  const { data: client } = await supabase
    .from("clients")
    .select(`${statField}, avg_response_hours, name`)
    .eq("id", script.client_id)
    .single();

  if (client) {
    const currentCount = (client as Record<string, number>)[statField] ?? 0;

    // Calculate avg_response_hours using exponential moving average
    const sentAt = script.sent_at ? new Date(script.sent_at) : null;
    const responseHours = sentAt
      ? (respondedAt.getTime() - sentAt.getTime()) / (1000 * 60 * 60)
      : null;

    const alpha = 0.3;
    const oldAvg = client.avg_response_hours ?? 48;
    const newAvg = responseHours !== null
      ? alpha * responseHours + (1 - alpha) * oldAvg
      : oldAvg;

    await supabase
      .from("clients")
      .update({
        [statField]: currentCount + 1,
        avg_response_hours: newAvg,
      })
      .eq("id", script.client_id);
  }

  // Get script title for memory + team notification
  const { data: scriptForMemory } = await supabase
    .from("scripts")
    .select("title")
    .eq("id", script.id)
    .single();

  if (scriptForMemory) {
    // Part 3: Notify team
    if (client) {
      await notifyTeam(client.name, action, scriptForMemory.title, feedback ?? null);
    }

    const sentAt = script.sent_at ? new Date(script.sent_at) : null;
    const respHours = sentAt
      ? (respondedAt.getTime() - sentAt.getTime()) / (1000 * 60 * 60)
      : null;

    storeClientMemory(
      script.client_id,
      buildClientResponseMemory({
        clientName: client.name,
        scriptTitle: scriptForMemory.title,
        intent: action,
        feedback: feedback ?? null,
        responseHours: respHours,
        channel: "email",
      }),
      "client_response",
      { script_id: script.id, review_token: token }
    ).catch((err: unknown) => console.error("[review] Memory storage failed:", err));
  }

  return NextResponse.json({ success: true, status: action });
}
