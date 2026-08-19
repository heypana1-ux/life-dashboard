import { createClient, SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

/*
  Server-side push helpers. Subscriptions live in a Supabase table written with the SERVICE
  ROLE key (server only), and web-push is configured from the VAPID env vars. All of this is
  optional: without the env vars the push endpoints report "not configured" and the app keeps
  working with in-app reminders only.
*/

export const PUSH_TABLE = "push_subscriptions";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Supabase client with the service-role key (bypasses RLS). Null if not configured. */
export function pushDb(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

let configured = false;

/** Configure web-push from the VAPID env vars. Returns false if they're missing. */
export function configureWebPush(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:notifications@example.com";
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
  return true;
}

export { webpush };
