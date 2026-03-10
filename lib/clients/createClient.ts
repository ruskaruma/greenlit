import { createServiceClientDirect } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/validation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export interface CreateClientInput {
  name: string;
  email: string;
  company?: string | null;
  whatsapp_number?: string | null;
  preferred_channel?: string;
  instagram_handle?: string | null;
  youtube_channel_id?: string | null;
  twitter_handle?: string | null;
  linkedin_url?: string | null;
  brand_voice?: string | null;
  account_manager?: string | null;
  contract_start?: string | null;
  monthly_volume?: number | null;
  platform_focus?: string[] | null;
  onboarding_checklist?: Record<string, boolean> | null;
}

export interface CreateClientResult {
  client: Record<string, unknown> | null;
  error: string | null;
}

/**
 * Shared client creation logic used by both /api/clients and /api/onboarding.
 * Validates input and inserts into the clients table.
 */
export async function createClient(input: CreateClientInput): Promise<CreateClientResult> {
  if (!input.name || !input.email) {
    return { client: null, error: "Name and email are required" };
  }

  if (!isValidEmail(input.email)) {
    return { client: null, error: "Invalid email address" };
  }

  const supabase: SupabaseAny = createServiceClientDirect();

  const insertData: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    preferred_channel: input.preferred_channel || "email",
  };

  if (input.company) insertData.company = input.company;
  if (input.whatsapp_number) insertData.whatsapp_number = input.whatsapp_number;
  if (input.instagram_handle) insertData.instagram_handle = input.instagram_handle;
  if (input.youtube_channel_id) insertData.youtube_channel_id = input.youtube_channel_id;
  if (input.twitter_handle) insertData.twitter_handle = input.twitter_handle;
  if (input.linkedin_url) insertData.linkedin_url = input.linkedin_url;
  if (input.brand_voice) insertData.brand_voice = input.brand_voice;
  if (input.account_manager) insertData.account_manager = input.account_manager;
  if (input.contract_start) insertData.contract_start = input.contract_start;
  if (input.monthly_volume != null) insertData.monthly_volume = input.monthly_volume;
  if (input.platform_focus && input.platform_focus.length > 0) insertData.platform_focus = input.platform_focus;
  if (input.onboarding_checklist) insertData.onboarding_checklist = input.onboarding_checklist;

  const { data, error } = await supabase
    .from("clients")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    return { client: null, error: error.message };
  }

  return { client: data, error: null };
}
