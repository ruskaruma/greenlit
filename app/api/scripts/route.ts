import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";
import { sendReviewEmail } from "@/lib/resend/sendReviewEmail";
import { sendWhatsApp } from "@/lib/twilio/sendWhatsApp";
import type { Script, ScriptWithClient } from "@/lib/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function GET() {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const supabase = createServiceClientDirect();

  const { data, error } = await (supabase as SupabaseAny)
    .from("scripts")
    .select("*, client:clients(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as ScriptWithClient[]);
}

export async function POST(request: Request) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const supabase: SupabaseAny = createServiceClientDirect();
  const body = await request.json();

  const { title, content, client_id, due_date, review_channel } = body as {
    title: string;
    content: string;
    client_id: string;
    due_date?: string;
    review_channel?: string;
  };

  if (!title || !content || !client_id) {
    return NextResponse.json(
      { error: "title, content, and client_id are required" },
      { status: 400 }
    );
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: script, error: scriptError } = await supabase
    .from("scripts")
    .insert({
      title,
      content,
      client_id,
      status: "pending_review",
      due_date: due_date ?? null,
      expires_at: expiresAt,
      sent_at: null,
    })
    .select()
    .single();

  if (scriptError) {
    return NextResponse.json({ error: scriptError.message }, { status: 500 });
  }

  const typedScript = script as Script;

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("name, email, total_scripts, whatsapp_number, preferred_channel")
    .eq("id", client_id)
    .single();

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  // Increment total_scripts
  await supabase
    .from("clients")
    .update({ total_scripts: (client.total_scripts ?? 0) + 1 })
    .eq("id", client_id);

  // Send review notifications
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reviewUrl = `${appUrl}/review/${typedScript.review_token}`;
  const channel: string = review_channel || client.preferred_channel || "email";

  let anySendSucceeded = false;

  if (channel === "email" || channel === "both") {
    const emailResult = await sendReviewEmail({
      to: client.email,
      clientName: client.name,
      scriptTitle: typedScript.title,
      reviewUrl,
      expiresAt: typedScript.expires_at,
    });
    if (emailResult.success) {
      anySendSucceeded = true;
    } else {
      console.error("[scripts/POST] Review email failed:", emailResult.error);
    }
  }

  if ((channel === "whatsapp" || channel === "both") && client.whatsapp_number) {
    const waResult = await sendWhatsApp({
      to: client.whatsapp_number,
      clientName: client.name,
      scriptTitle: typedScript.title,
      reviewUrl,
    });
    if (waResult.success) {
      anySendSucceeded = true;
    } else {
      console.error("[scripts/POST] WhatsApp failed:", waResult.error);
    }
  }

  // Mark script as sent ONLY if at least one delivery method succeeded
  if (anySendSucceeded) {
    await supabase
      .from("scripts")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", typedScript.id);
  }

  return NextResponse.json(typedScript, { status: 201 });
}
