import { createServiceClientDirect } from "@/lib/supabase/server";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";
import { storeClientMemory, buildClientResponseMemory } from "@/lib/agent/nodes/memoryUpdate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type Intent = "approve" | "reject" | "feedback";

async function classifyIntent(
  message: string
): Promise<{ intent: Intent; feedback: string | null }> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Classify this client reply to a script review. Return ONLY valid JSON.

Message: "${message}"

Rules:
- If the message clearly approves (e.g. "approve", "looks good", "yes", "LGTM"), return {"intent":"approve","feedback":null}
- If the message clearly rejects (e.g. "reject", "no", "kill it"), return {"intent":"reject","feedback":null}
- Otherwise, treat it as feedback and return {"intent":"feedback","feedback":"<the original message>"}

JSON:`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const parsed = JSON.parse(text.trim());
      return {
        intent: parsed.intent as Intent,
        feedback: parsed.feedback ?? null,
      };
    } catch {
      console.warn("[whatsapp-webhook] Claude returned unparseable JSON, raw:", text);
      return { intent: "feedback", feedback: message };
    }
  } catch (err) {
    console.error("[whatsapp-webhook] Claude intent classification failed:", err);
    return {
      intent: "feedback",
      feedback: "Client replied but intent unclear — please review manually",
    };
  }
}

async function notifyTeam(
  clientName: string,
  intent: Intent,
  scriptTitle: string,
  feedback: string | null
) {
  const teamEmail = process.env.ALLOWED_EMAIL;
  if (!teamEmail || !resend) return;

  const actionLabel =
    intent === "approve" ? "approved" :
    intent === "reject" ? "rejected" :
    "requested changes on";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    await resend.emails.send({
      from: `Greenlit <${process.env.RESEND_FROM_EMAIL || "greenlit@ruskaruma.me"}>`,
      to: [teamEmail],
      subject: `[Greenlit] ${clientName} ${actionLabel} '${scriptTitle}'`,
      text: `Client ${clientName} replied via WhatsApp.\n\nDecision: ${intent}\nFeedback: ${feedback || "none"}\n\nView in dashboard: ${appUrl}/dashboard`,
    });
  } catch (err) {
    console.error("[whatsapp-webhook] Team notification email failed:", err);
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get("From")?.toString() ?? "";
  const body = formData.get("Body")?.toString()?.trim() ?? "";

  if (!from || !body) {
    return twiml("Invalid request.");
  }

  const phoneNumber = from.replace("whatsapp:", "");

  const supabase: SupabaseAny = createServiceClientDirect();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, avg_response_hours")
    .eq("whatsapp_number", phoneNumber)
    .single();

  if (clientError || !client) {
    return twiml("Sorry, we couldn't find your account. Please contact your team lead.");
  }

  const { data: script, error: scriptError } = await supabase
    .from("scripts")
    .select("id, title, status, sent_at")
    .eq("client_id", client.id)
    .eq("status", "pending_review")
    .order("sent_at", { ascending: false })
    .limit(1)
    .single();

  if (scriptError || !script) {
    return twiml("No pending scripts found for review. If you think this is an error, please contact your team lead.");
  }

  const { intent, feedback } = await classifyIntent(body);

  const statusMap: Record<Intent, string> = {
    approve: "approved",
    reject: "rejected",
    feedback: "changes_requested",
  };

  const newStatus = statusMap[intent];
  const respondedAt = new Date();

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    reviewed_at: respondedAt.toISOString(),
    updated_at: respondedAt.toISOString(),
  };
  if (feedback) {
    updatePayload.client_feedback = feedback;
  }

  await supabase.from("scripts").update(updatePayload).eq("id", script.id);

  const sentAt = script.sent_at ? new Date(script.sent_at) : null;
  const responseHours = sentAt
    ? (respondedAt.getTime() - sentAt.getTime()) / (1000 * 60 * 60)
    : null;

  const alpha = 0.3;
  const oldAvg = client.avg_response_hours ?? 48;
  const newAvg = responseHours !== null
    ? alpha * responseHours + (1 - alpha) * oldAvg
    : oldAvg;

  const statField =
    intent === "approve" ? "approved_count" :
    intent === "reject" ? "rejected_count" :
    "changes_requested_count";

  const { data: clientStats } = await supabase
    .from("clients")
    .select(statField)
    .eq("id", client.id)
    .single();

  const currentCount = clientStats ? ((clientStats as Record<string, number>)[statField] ?? 0) : 0;

  await supabase
    .from("clients")
    .update({
      [statField]: currentCount + 1,
      avg_response_hours: newAvg,
    })
    .eq("id", client.id);

  await supabase.from("whatsapp_messages").insert({
    client_id: client.id,
    script_id: script.id,
    direction: "inbound",
    body,
    from_number: phoneNumber,
    classified_intent: intent,
  });

  await supabase.from("audit_log").insert({
    entity_type: "script",
    entity_id: script.id,
    action: `whatsapp_${intent}`,
    actor: `whatsapp:${client.name}`,
    metadata: { phone: phoneNumber, message: body, intent },
  });

  await notifyTeam(client.name, intent, script.title, feedback);

  storeClientMemory(
    client.id,
    buildClientResponseMemory({
      clientName: client.name,
      scriptTitle: script.title,
      intent,
      feedback,
      responseHours,
      channel: "whatsapp",
    }),
    "client_response",
    { script_id: script.id }
  ).catch((err: unknown) => console.error("[whatsapp-webhook] Memory storage failed:", err));

  const replyMap: Record<Intent, string> = {
    approve: `"${script.title}" has been approved. Thank you, ${client.name}!`,
    reject: `"${script.title}" has been rejected. Your team lead has been notified.`,
    feedback: `Your feedback on "${script.title}" has been recorded. The team will review and follow up.`,
  };

  return twiml(replyMap[intent]);
}

function twiml(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
