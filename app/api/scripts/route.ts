import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";
import { scoreScript } from "@/lib/scorer/scoreScript";
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

  const { title, content, client_id, due_date, review_channel, response_deadline_minutes, platform } = body as {
    title: string;
    content: string;
    client_id: string;
    due_date?: string;
    review_channel?: string;
    response_deadline_minutes?: number;
    platform?: string;
  };

  if (!title || !client_id) {
    return NextResponse.json(
      { error: "title and client_id are required" },
      { status: 400 }
    );
  }

  // Guard: empty script content
  if (!content || !content.trim()) {
    return NextResponse.json(
      { error: "Script content is required. The approval loop cannot function without the script text." },
      { status: 400 }
    );
  }

  // Fetch client to validate contact info before inserting
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("name, email, total_scripts, whatsapp_number, preferred_channel")
    .eq("id", client_id)
    .single();

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  // Guard: no contact info
  if (!client.email && !client.whatsapp_number) {
    return NextResponse.json(
      { error: "This client has no email or WhatsApp number. Add contact information before uploading scripts." },
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
      status: "draft",
      due_date: due_date ?? null,
      expires_at: expiresAt,
      response_deadline_minutes: response_deadline_minutes ?? 2880,
      sent_at: null,
    })
    .select()
    .single();

  if (scriptError) {
    return NextResponse.json({ error: scriptError.message }, { status: 500 });
  }

  const typedScript = script as Script;

  // Increment total_scripts
  await supabase
    .from("clients")
    .update({ total_scripts: (client.total_scripts ?? 0) + 1 })
    .eq("id", client_id);

  // Score the script synchronously
  let qualityScore: Script["quality_score"] = null;
  try {
    qualityScore = await scoreScript({
      content,
      clientId: client_id,
      platform,
      supabase,
    });

    if (qualityScore) {
      await supabase
        .from("scripts")
        .update({ quality_score: qualityScore })
        .eq("id", typedScript.id);
    }
  } catch (err) {
    console.error("[scripts/POST] Scorer failed (non-blocking):", err);
  }

  return NextResponse.json(
    {
      ...typedScript,
      quality_score: qualityScore,
      review_channel: review_channel || client.preferred_channel || "email",
    },
    { status: 201 }
  );
}
