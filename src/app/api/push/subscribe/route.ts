import { NextRequest, NextResponse } from "next/server";
import { pushDb, PUSH_TABLE } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Store (upsert) a push subscription plus the user's reminder time, timezone and language. */
export async function POST(req: NextRequest) {
  const db = pushDb();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let body: {
    subscription?: { endpoint?: string };
    checkinTime?: string;
    habitReminders?: boolean;
    language?: string;
    timezone?: string;
    weeklyRecap?: boolean;
    weeklySummary?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const sub = body.subscription;
  if (!sub?.endpoint) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const row = {
    endpoint: sub.endpoint,
    subscription: sub,
    checkin_time: typeof body.checkinTime === "string" ? body.checkinTime : null,
    habit_reminders: !!body.habitReminders,
    language: body.language === "de" ? "de" : "en",
    timezone: typeof body.timezone === "string" ? body.timezone : "UTC",
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from(PUSH_TABLE).upsert(row, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: "db", detail: error.message.slice(0, 200) }, { status: 500 });

  // Best-effort weekly-recap fields. If the table doesn't have these columns yet the update
  // errors and is ignored — the daily reminder above keeps working without them. To enable the
  // weekly recap, add: weekly_recap boolean, weekly_summary text, last_weekly text.
  await db
    .from(PUSH_TABLE)
    .update({
      weekly_recap: !!body.weeklyRecap,
      weekly_summary: typeof body.weeklySummary === "string" ? body.weeklySummary : null,
    })
    .eq("endpoint", sub.endpoint);

  return NextResponse.json({ ok: true });
}

/** Remove a subscription (user turned push off or unsubscribed). */
export async function DELETE(req: NextRequest) {
  const db = pushDb();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.endpoint) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  await db.from(PUSH_TABLE).delete().eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}
