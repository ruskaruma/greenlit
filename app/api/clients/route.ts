import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";
import type { Client } from "@/lib/supabase/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function GET() {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const supabase = createServiceClientDirect();

  const { data, error } = await (supabase as SupabaseAny)
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Client[]);
}

export async function POST(request: Request) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const supabase = createServiceClientDirect();
  const body = await request.json();

  const { name, email, company, whatsapp, preferred_channel } = body as {
    name: string;
    email: string;
    company?: string;
    whatsapp?: string;
    preferred_channel?: string;
  };

  if (!name || !email) {
    return NextResponse.json(
      { error: "name and email are required" },
      { status: 400 }
    );
  }

  const insertData: Record<string, unknown> = {
    name,
    email,
    company: company ?? null,
  };
  if (whatsapp) insertData.whatsapp_number = whatsapp;
  if (preferred_channel) insertData.preferred_channel = preferred_channel;

  const { data, error } = await (supabase as SupabaseAny)
    .from("clients")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Client, { status: 201 });
}
