import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";
import { storeClientMemory } from "@/lib/agent/nodes/memoryUpdate";
import { sendWelcomeEmail } from "@/lib/resend/sendWelcomeEmail";
import { createClientFolder } from "@/lib/integrations/googleDrive";
import { createClientPage } from "@/lib/integrations/notion";
import { addClientRecord } from "@/lib/integrations/airtable";
import twilio from "twilio";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

export async function POST(request: Request) {
  try {
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
    twitter_handle,
    linkedin_url,
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


  const insertData: Record<string, unknown> = {
    name,
    email,
    preferred_channel: preferred_channel || "email",
  };
  if (company) insertData.company = company;
  if (whatsapp_number) insertData.whatsapp_number = whatsapp_number;
  if (instagram_handle) insertData.instagram_handle = instagram_handle;
  if (youtube_channel_id) insertData.youtube_channel_id = youtube_channel_id;
  if (twitter_handle) insertData.twitter_handle = twitter_handle;
  if (linkedin_url) insertData.linkedin_url = linkedin_url;
  if (brand_voice) insertData.brand_voice = brand_voice;
  if (account_manager) insertData.account_manager = account_manager;
  if (contract_start) insertData.contract_start = contract_start;
  if (monthly_volume) insertData.monthly_volume = parseInt(monthly_volume);
  if (platform_focus?.length > 0) insertData.platform_focus = platform_focus;
  insertData.onboarding_checklist = {
    welcome_email: false,
    google_drive: false,
    notion_page: false,
    airtable_entry: false,
    first_brief: false,
  };

  const { data: client, error: insertErr } = await supabase
    .from("clients")
    .insert(insertData)
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const clientId = client.id as string;
  const results: Record<string, { success: boolean; error?: string }> = {};

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

  // Google Drive: Create client folder
  try {
    const driveResult = await createClientFolder({
      clientName: name,
      company: company || undefined,
      clientEmail: email,
    });
    results.google_drive = driveResult;

    if (driveResult.success) {
      await supabase
        .from("clients")
        .update({
          onboarding_checklist: {
            ...(client.onboarding_checklist ?? {}),
            welcome_email: results.welcome_email?.success ?? false,
            google_drive: true,
            google_drive_url: driveResult.folderUrl,
          },
        })
        .eq("id", clientId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Google Drive failed";
    console.error("[onboarding] Google Drive error:", msg);
    results.google_drive = { success: false, error: msg };
  }

  // Notion: Create client page
  try {
    const notionResult = await createClientPage({
      clientName: name,
      company: company || undefined,
      email,
      accountManager: account_manager || undefined,
      platforms: platform_focus?.length > 0 ? platform_focus : undefined,
      brandVoice: brand_voice || undefined,
      contractStart: contract_start || undefined,
      monthlyVolume: monthly_volume ? parseInt(monthly_volume) : undefined,
    });
    results.notion_page = notionResult;

    if (notionResult.success) {
      const currentChecklist = (
        await supabase.from("clients").select("onboarding_checklist").eq("id", clientId).single()
      ).data?.onboarding_checklist ?? {};

      await supabase
        .from("clients")
        .update({
          onboarding_checklist: {
            ...currentChecklist,
            notion_page: true,
            notion_page_url: notionResult.pageUrl,
          },
        })
        .eq("id", clientId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Notion failed";
    console.error("[onboarding] Notion error:", msg);
    results.notion_page = { success: false, error: msg };
  }

  // Airtable: Add client record
  try {
    const airtableResult = await addClientRecord({
      clientName: name,
      company: company || undefined,
      email,
      accountManager: account_manager || undefined,
      platforms: platform_focus?.length > 0 ? platform_focus : undefined,
      monthlyVolume: monthly_volume ? parseInt(monthly_volume) : undefined,
      contractStart: contract_start || undefined,
    });
    results.airtable_entry = airtableResult;

    if (airtableResult.success) {
      const currentChecklist = (
        await supabase.from("clients").select("onboarding_checklist").eq("id", clientId).single()
      ).data?.onboarding_checklist ?? {};

      await supabase
        .from("clients")
        .update({
          onboarding_checklist: {
            ...currentChecklist,
            airtable_entry: true,
            airtable_record_url: airtableResult.recordUrl,
          },
        })
        .eq("id", clientId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Airtable failed";
    console.error("[onboarding] Airtable error:", msg);
    results.airtable_entry = { success: false, error: msg };
  }

  try {
    await supabase.from("audit_log").insert({
      entity_type: "client",
      entity_id: clientId,
      action: "client_onboarded",
      actor: "team_lead",
      metadata: { name, email, company, platform_focus, results },
    });
  } catch {
    console.error("[onboarding] Audit log failed");
  }

  return NextResponse.json({ client, results }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[onboarding] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
