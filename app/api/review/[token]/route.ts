import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { storeClientMemory, buildClientResponseMemory } from "@/lib/agent/nodes/memoryUpdate";
import { notifyTeam } from "@/lib/notifications/notifyTeam";
import { isRateLimited } from "@/lib/rateLimit";
import type { ScriptStatus } from "@/lib/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

function extractIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = extractIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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
  const ip = extractIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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
      await notifyTeam({ clientName: client.name, action, scriptTitle: scriptForMemory.title, feedback: feedback ?? null, channel: "both" });
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
