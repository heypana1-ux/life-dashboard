import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/*
  Deletes the signed-in user's account and every synced row that belongs to it.

  Both stores now require an in-app way to delete an account, and Art. 17 GDPR requires it
  anyway. Supabase deliberately gives no client-side "delete my own auth user", so this route
  does it with the service-role key — which is why it must verify who is calling first:

    1. Read the caller's access token from the Authorization header.
    2. Ask Supabase whose token it is. An invalid or expired token stops here.
    3. Delete only that user's data row and only that user's auth record.

  The id to delete is taken from the verified token, never from the request body, so a caller
  can't delete somebody else's account by guessing an id.

  Needs SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC_) in the environment.
*/

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SYNC_TABLE = "app_data";

export async function POST(req: Request) {
  if (!URL_ || !SERVICE_KEY) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createClient(URL_, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  const user = userRes?.user;
  if (userErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Data first: if the auth record went away first and this failed, the row would be orphaned
  // with no way for the user to reach it again.
  const { error: rowErr } = await admin.from(SYNC_TABLE).delete().eq("user_id", user.id);
  if (rowErr) return NextResponse.json({ error: "data_delete_failed" }, { status: 500 });

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return NextResponse.json({ error: "account_delete_failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
