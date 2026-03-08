import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";
import { sendReviewEmail } from "@/lib/resend/sendReviewEmail";
import { sendWhatsApp } from "@/lib/twilio/sendWhatsApp";

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
  const { review_channel } = body as { review_channel?: string };

  // Fetch script + client
  const { data: script, error: scriptError } = await supabase
    .from("scripts")
    .select("*, client:clients(name, email, whatsapp_number, preferred_channel)")
    .eq("id", id)
    .single();

  if (scriptError || !script) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  if (script.status !== "draft") {
    return NextResponse.json({ error: "Script already sent" }, { status: 409 });
  }

  const client = script.client;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reviewUrl = `${appUrl}/review/${script.review_token}`;
  const channel: string = review_channel || client.preferred_channel || "email";

  let anySendSucceeded = false;

  if (channel === "email" || channel === "both") {
    const emailResult = await sendReviewEmail({
      to: client.email,
      clientName: client.name,
      scriptTitle: script.title,
      reviewUrl,
      expiresAt: script.expires_at,
    });
    if (emailResult.success) {
      anySendSucceeded = true;
    } else {
      console.error("[scripts/send] Review email failed:", emailResult.error);
    }
  }

  if ((channel === "whatsapp" || channel === "both") && client.whatsapp_number) {
    const waResult = await sendWhatsApp({
      to: client.whatsapp_number,
      clientName: client.name,
      scriptTitle: script.title,
      reviewUrl,
      clientEmail: client.email,
      scriptId: script.id,
    });
    if (waResult.success) {
      anySendSucceeded = true;
    } else {
      console.error("[scripts/send] WhatsApp failed:", waResult.error);
    }
  }

  if (anySendSucceeded) {
    await supabase
      .from("scripts")
      .update({
        status: "pending_review",
        sent_at: new Date().toISOString(),
      })
      .eq("id", id);
  } else {
    // Still mark as pending_review even if delivery failed
    await supabase
      .from("scripts")
      .update({ status: "pending_review" })
      .eq("id", id);
  }

  return NextResponse.json({ success: true, sent: anySendSucceeded });
}
