import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function GET() {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const supabase: SupabaseAny = createServiceClientDirect();

  const { data, error } = await supabase
    .from("reports")
    .select("*, clients(name, email, company)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reports = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    client: row.clients,
  }));

  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const body = await request.json();
  const {
    client_id,
    script_id,
    platform,
    content_type,
    content_title,
    post_url,
    post_date,
    metrics,
    previous_metrics,
  } = body;

  if (!client_id || !metrics || !platform || !content_type || !content_title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase: SupabaseAny = createServiceClientDirect();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      client_id,
      script_id: script_id || null,
      platform,
      content_type,
      content_title,
      post_url: post_url || null,
      post_date: post_date || null,
      metrics,
      previous_metrics: previous_metrics || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ report: data });
}
