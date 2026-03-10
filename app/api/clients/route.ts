import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/requireSession";
import { createClient as createClientInDb } from "@/lib/clients/createClient";
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

  const body = await request.json();
  const { name, email, company, whatsapp, preferred_channel } = body as {
    name: string;
    email: string;
    company?: string;
    whatsapp?: string;
    preferred_channel?: string;
  };

  const result = await createClientInDb({
    name,
    email,
    company: company ?? null,
    whatsapp_number: whatsapp ?? null,
    preferred_channel,
  });

  if (result.error) {
    const status = result.error === "Invalid email address" || result.error.includes("required") ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.client as unknown as Client, { status: 201 });
}
