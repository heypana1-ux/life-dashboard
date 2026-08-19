import { NextRequest, NextResponse } from "next/server";
import { pushDb, PUSH_TABLE, configureWebPush, webpush } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  Called on a schedule (Vercel Cron, or any external cron hitting ?key=CRON_SECRET). Sends the
  daily check-in reminder to every subscription whose LOCAL time has just passed its chosen
  reminder time, once per local day. On Sunday evenings it also sends the weekly recap (the
  client-precomputed text stored in `weekly_summary`). Expired subscriptions (404/410) are pruned.

  Weekly recap needs three extra columns on the push_subscriptions table — it's skipped silently
  if they don't exist, so the daily reminder keeps working without them:
    alter table push_subscriptions
      add column if not exists weekly_recap boolean default false,
      add column if not exists weekly_summary text,
      add column if not exists last_weekly text;
*/

// How long after the target minute we still deliver — covers infrequent cron cadences.
const WINDOW_MIN = 90;
// Weekly recap goes out Sunday evening at ~19:00 local.
const WEEKLY_TARGET_MIN = 19 * 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret set → allow (useful in local/dev)
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("key") === secret;
}

/** Local date (YYYY-MM-DD), minutes-since-midnight, and weekday (0=Sun) in a given timezone. */
function nowInTz(tz: string): { date: string; minutes: number; weekday: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  let hh = Number(parts.hour);
  if (hh === 24) hh = 0;
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hh * 60 + Number(parts.minute),
    weekday: wdMap[parts.weekday] ?? 0,
  };
}

const TEXT = {
  de: { title: "Life Dashboard", body: "Zeit für deinen Check-in — trag deinen Tag ein." },
  en: { title: "Life Dashboard", body: "Time for your check-in — log your day." },
};
const WEEKLY_TITLE = { de: "Dein Wochenrückblick", en: "Your weekly recap" };

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = pushDb();
  if (!db || !configureWebPush()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data: rows, error } = await db.from(PUSH_TABLE).select("*");
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  // Test mode: ?test=1 sends a notification to every subscription now, ignoring the schedule.
  const test = new URL(req.url).searchParams.get("test") === "1";

  let sent = 0;
  let weekly = 0;
  let removed = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    const lang = row.language === "de" ? "de" : "en";
    if (test) {
      const text = TEXT[lang];
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
    const tz = row.timezone || "UTC";
    let now: { date: string; minutes: number; weekday: number };
    try {
      now = nowInTz(tz);
    } catch {
      now = nowInTz("UTC");
    }

    // ---- Weekly recap (Sunday evening) — only when the extra columns exist. ----
    if (
      "weekly_recap" in row &&
      row.weekly_recap &&
      row.weekly_summary &&
      now.weekday === 0 &&
      now.minutes >= WEEKLY_TARGET_MIN &&
      now.minutes < WEEKLY_TARGET_MIN + WINDOW_MIN &&
      row.last_weekly !== now.date
    ) {
      try {
        await webpush.sendNotification(
          row.subscription,
          JSON.stringify({ title: WEEKLY_TITLE[lang], body: String(row.weekly_summary), url: "/reports", tag: "weekly-recap" }),
        );
        await db.from(PUSH_TABLE).update({ last_weekly: now.date }).eq("endpoint", row.endpoint);
        weekly++;
      } catch (e: unknown) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await db.from(PUSH_TABLE).delete().eq("endpoint", row.endpoint);
          removed++;
          continue;
        }
      }
    }

    if (!row.checkin_time) {
      skipped++;
      continue;
    }
    const [h, m] = String(row.checkin_time).split(":").map(Number);
    const target = h * 60 + m;
    const due = now.minutes >= target && now.minutes < target + WINDOW_MIN;
    if (!due || row.last_sent === now.date) {
      skipped++;
      continue;
    }
    const text = TEXT[lang];
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

  return NextResponse.json({ ok: true, sent, weekly, removed, skipped, total: rows?.length ?? 0 });
}

export const GET = handle;
export const POST = handle;
