import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";
import { storeClientMemory } from "@/lib/agent/nodes/memoryUpdate";
import { sendWelcomeEmail } from "@/lib/resend/sendWelcomeEmail";
import twilio from "twilio";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

export async function POST(request: Request) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const body = await request.json();
  const {
    name,
    email,
    company,
    whatsapp_number,
    preferred_channel,
    instagram_handle,
    youtube_channel_id,
    brand_voice,
    account_manager,
    contract_start,
    monthly_volume,
    platform_focus,
  } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const supabase: SupabaseAny = createServiceClientDirect();

  // 1. Create client
  const { data: client, error: insertErr } = await supabase
    .from("clients")
    .insert({
      name,
      email,
      company: company || null,
      whatsapp_number: whatsapp_number || null,
      preferred_channel: preferred_channel || "email",
      instagram_handle: instagram_handle || null,
      youtube_channel_id: youtube_channel_id || null,
      brand_voice: brand_voice || null,
      account_manager: account_manager || null,
      contract_start: contract_start || null,
      monthly_volume: monthly_volume ? parseInt(monthly_volume) : null,
      platform_focus: platform_focus?.length > 0 ? platform_focus : null,
      onboarding_checklist: {
        welcome_email: false,
        google_drive: false,
        notion_page: false,
        airtable_entry: false,
        first_brief: false,
      },
    })
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const clientId = client.id as string;
  const results: Record<string, { success: boolean; error?: string }> = {};

  // 2. Seed 3 memories with embeddings
  try {
    const platformStr = platform_focus?.length > 0 ? platform_focus.join(", ") : "not specified";
    const voiceStr = brand_voice || "no specific brand voice noted";

    await storeClientMemory(
      clientId,
      `New client onboarded: ${name}${company ? ` (${company})` : ""}. Preferred channel: ${preferred_channel || "email"}. Platforms: ${platformStr}. Monthly volume: ${monthly_volume || "not set"} pieces.`,
      "behavioral_pattern"
    );

    await storeClientMemory(
      clientId,
      `Brand voice and communication style: ${voiceStr}. ${account_manager ? `Account manager: ${account_manager}.` : ""}`,
      "behavioral_pattern"
    );

    await storeClientMemory(
      clientId,
      `Client prefers communication via ${preferred_channel || "email"}.${whatsapp_number ? ` WhatsApp available at ${whatsapp_number}.` : " No WhatsApp number provided."} This is a new client, no approval history yet.`,
      "behavioral_pattern"
    );

    results.memories = { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Memory seeding failed";
    console.error("[onboarding] Memory error:", msg);
    results.memories = { success: false, error: msg };
  }

  // 3. Send welcome email
  try {
    const emailResult = await sendWelcomeEmail({
      to: email,
      clientName: name,
      company: company || null,
      accountManager: account_manager || null,
    });
    results.welcome_email = emailResult;

    if (emailResult.success) {
      await supabase
        .from("clients")
        .update({ onboarding_checklist: { ...client.onboarding_checklist, welcome_email: true } })
        .eq("id", clientId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Email failed";
    results.welcome_email = { success: false, error: msg };
  }

  // 4. Send WhatsApp notification to founder
  const demoWhatsApp = process.env.DEMO_WHATSAPP_NUMBER;
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM;
  if (twilioClient && demoWhatsApp && twilioFrom) {
    try {
      await twilioClient.messages.create({
        body: `New client onboarded: ${name}${company ? ` (${company})` : ""}. Email: ${email}. Channel: ${preferred_channel || "email"}.`,
        from: twilioFrom,
        to: `whatsapp:${demoWhatsApp}`,
      });
      results.whatsapp = { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "WhatsApp failed";
      console.error("[onboarding] WhatsApp error:", msg);
      results.whatsapp = { success: false, error: msg };
    }
  } else {
    results.whatsapp = { success: false, error: "Twilio not configured" };
  }

  // 5. Audit log
  await supabase.from("audit_log").insert({
    entity_type: "client",
    entity_id: clientId,
    action: "client_onboarded",
    actor: "team_lead",
    metadata: { name, email, company, platform_focus, results },
  });

  return NextResponse.json({ client, results }, { status: 201 });
}
