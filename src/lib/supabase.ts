import { createClient, SupabaseClient } from "@supabase/supabase-js";

/*
  Optional cloud sync. The Supabase client only exists when both env vars are set
  (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY). Without them the whole app
  keeps working purely on localStorage — sync features simply stay hidden.
*/

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSyncConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSyncConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

/** The single table that holds one JSON blob per user. */
export const SYNC_TABLE = "app_data";
