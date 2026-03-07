import { NextResponse } from "next/server";
import { createServiceClientDirect } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function GET() {
  const supabase: SupabaseAny = createServiceClientDirect();

  const { count, error } = await supabase
    .from("chasers")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_hitl");

  if (error) {
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
