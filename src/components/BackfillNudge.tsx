"use client";

import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { addDays, fmtShort, todayISO, weekdayLabel, weekdayOf } from "@/lib/date";
import { isRestDay } from "@/lib/streak";
import { Card } from "@/components/ui";

/**
 * Gentle nudge to backfill recent days you never checked in on. Vacation/rest days are skipped,
 * and each chip deep-links to that day's check-in — filling it also heals your streak.
 */
export function BackfillNudge({ days = 7, max = 6 }: { days?: number; max?: number }) {
  const { data, ready } = useStore();
  const t = useT();
  if (!ready) return null;

  const reviewed = new Set(data.reviews.map((r) => r.date));
  const today = todayISO();
  const missing: string[] = [];
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, -i);
    if (reviewed.has(d) || isRestDay(data.settings, d)) continue;
    missing.push(d);
  }
  if (missing.length === 0) return null;

  return (
    <Card className="mb-4 border-[var(--warn)]/30">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--warn)]/15 text-[var(--warn)]">
          <CalendarPlus size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{t("You have days to catch up on")}</div>
          <div className="mb-2 text-xs text-[var(--text-muted)]">
            {t("Fill them in to keep your history complete — it also restores your streak.")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missing.slice(0, max).map((d) => (
              <Link
                key={d}
                href={`/today?date=${d}`}
                className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-3)]"
              >
                {t(weekdayLabel(weekdayOf(d), false))}, {fmtShort(d)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
