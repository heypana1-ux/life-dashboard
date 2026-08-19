import { NextRequest, NextResponse } from "next/server";
import { pushDb, PUSH_TABLE, configureWebPush, webpush } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  Called on a schedule (Vercel Cron, or any external cron hitting ?key=CRON_SECRET). Sends the
  daily check-in reminder to every subscription whose LOCAL time has just passed its chosen
  reminder time, once per local day. Expired subscriptions (404/410) are pruned.
*/

// How long after the target minute we still deliver — covers infrequent cron cadences.
const WINDOW_MIN = 90;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret set → allow (useful in local/dev)
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("key") === secret;
}

/** Local calendar date (YYYY-MM-DD) and minutes-since-midnight in a given IANA timezone. */
function nowInTz(tz: string): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  let hh = Number(parts.hour);
  if (hh === 24) hh = 0;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: hh * 60 + Number(parts.minute) };
}

const TEXT = {
  de: { title: "Life Dashboard", body: "Zeit für deinen Check-in — trag deinen Tag ein." },
  en: { title: "Life Dashboard", body: "Time for your check-in — log your day." },
};

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = pushDb();
  if (!db || !configureWebPush()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data: rows, error } = await db.from(PUSH_TABLE).select("*");
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  // Test mode: ?test=1 sends a notification to every subscription now, ignoring the schedule.
  const test = new URL(req.url).searchParams.get("test") === "1";

  let sent = 0;
  let removed = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    if (test) {
      const text = TEXT[row.language === "de" ? "de" : "en"];
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify({ title: text.title, body: text.body, url: "/today", tag: "test" }));
        sent++;
      } catch (e: unknown) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await db.from(PUSH_TABLE).delete().eq("endpoint", row.endpoint);
          removed++;
        }
      }
      continue;
    }
    if (!row.checkin_time) {
      skipped++;
      continue;
    }
    const tz = row.timezone || "UTC";
    let now: { date: string; minutes: number };
    try {
      now = nowInTz(tz);
    } catch {
      now = nowInTz("UTC");
    }
    const [h, m] = String(row.checkin_time).split(":").map(Number);
    const target = h * 60 + m;
    const due = now.minutes >= target && now.minutes < target + WINDOW_MIN;
    if (!due || row.last_sent === now.date) {
      skipped++;
      continue;
    }
    const text = TEXT[row.language === "de" ? "de" : "en"];
    try {
      await webpush.sendNotification(
        row.subscription,
        JSON.stringify({ title: text.title, body: text.body, url: "/today", tag: "daily-checkin" }),
      );
      await db.from(PUSH_TABLE).update({ last_sent: now.date }).eq("endpoint", row.endpoint);
      sent++;
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await db.from(PUSH_TABLE).delete().eq("endpoint", row.endpoint);
        removed++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, removed, skipped, total: rows?.length ?? 0 });
}

export const GET = handle;
export const POST = handle;
