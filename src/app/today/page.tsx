"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Moon, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { habitsForToday } from "@/lib/habitView";
import { todayISO, fmtLong, addDays } from "@/lib/date";
import { DailyReview } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { computeDay, scoreColor, scoreLabel } from "@/lib/score";
import {
  Card,
  PageHeader,
  SectionTitle,
  Button,
  ScaleInput,
  Field,
  inputCls,
  Badge,
} from "@/components/ui";
import { HabitRow } from "@/components/HabitRow";

const REVIEW_FIELDS: { key: keyof DailyReview; label: string }[] = [
  { key: "productivity", label: "Productivity" },
  { key: "mood", label: "Mood" },
  { key: "energy", label: "Energy" },
  { key: "satisfaction", label: "Satisfaction" },
  { key: "discipline", label: "Discipline" },
];

const blankReview = (date: string): DailyReview => ({
  date,
  productivity: 6,
  mood: 6,
  energy: 6,
  satisfaction: 6,
  discipline: 6,
});

export default function TodayPage() {
  const { data, saveReview } = useStore();
  const t = useT();
  const today = todayISO();
  const [date, setDate] = useState(today);

  // Allow deep-linking to a specific day (e.g. from the calendar) via ?date=YYYY-MM-DD.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("date");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q) && q <= today) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDate(q);
    }
  }, [today]);

  const comp = useMemo(() => computeDay(data, date), [data, date]);
  const goals = habitsForToday(data, date);
  const build = goals.filter((g) => g.habit.kind === "build");
  const reduce = goals.filter((g) => g.habit.kind === "reduce");

  const existing = data.reviews.find((r) => r.date === date);
  const [review, setReview] = useState<DailyReview>(existing ?? blankReview(date));
  // Load the selected day's check-in when the date changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReview(data.reviews.find((r) => r.date === date) ?? blankReview(date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  const [savedFlash, setSavedFlash] = useState(false);

  function save() {
    saveReview({ ...review, date });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  const projected = comp.lifeScore ?? 0;
  const doneCount = build.filter((g) => g.log?.done).length;
  const slipCount = reduce.filter((g) => g.log?.done).length;
  const checkinAvg = existing
    ? (
        (existing.productivity + existing.mood + existing.energy + existing.satisfaction + existing.discipline) /
        5
      ).toFixed(1)
    : "—";

  const isToday = date === today;

  return (
    <div>
      <PageHeader
        title={isToday ? t("Today") : t("Edit day")}
        subtitle={fmtLong(date)}
        action={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDate((d) => addDays(d, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
              aria-label={t("Move left")}
            >
              <ChevronLeft size={18} />
            </button>
            <label className="relative flex items-center">
              <CalendarDays size={15} className="pointer-events-none absolute left-2.5 text-[var(--text-faint)]" />
              <input
                type="date"
                max={today}
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-8 pr-2 text-sm outline-none"
              />
            </label>
            <button
              onClick={() => setDate((d) => (d < today ? addDays(d, 1) : d))}
              disabled={isToday}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] enabled:hover:bg-[var(--surface-3)] disabled:opacity-40"
              aria-label={t("Move right")}
            >
              <ChevronRight size={18} />
            </button>
            {!isToday && (
              <Button variant="soft" size="sm" onClick={() => setDate(today)}>
                {t("Today")}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid items-start gap-[18px] lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-[18px]">
          {/* Goals */}
          <Card>
            <SectionTitle
              right={
                <span className="text-xs text-[var(--text-faint)]">
                  {build.filter((g) => g.log?.done).length}/{build.length} {t("Done").toLowerCase()}
                </span>
              }
            >
              {t("Goals")}
            </SectionTitle>
            {build.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                {t("No habits scheduled today")}.{" "}
                <Link href="/habits" className="text-[var(--accent)]">
                  {t("Habits")}
                </Link>
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {build.map((g) => (
                  <HabitRow key={g.habit.id} item={g} date={date} showAmount />
                ))}
              </div>
            )}
          </Card>

          {/* Reduce habits */}
          {reduce.length > 0 && (
            <Card>
              <SectionTitle right={<Badge tone="bad">{t("Reduce")}</Badge>}>{t("Watch-list")}</SectionTitle>
              <p className="mb-1 text-xs text-[var(--text-muted)]">
                {t("Tap only if the behavior happened today. Avoided by default.")}
              </p>
              <div className="divide-y divide-[var(--border)]">
                {reduce.map((g) => (
                  <HabitRow key={g.habit.id} item={g} date={date} />
                ))}
              </div>
            </Card>
          )}

          {/* Daily review */}
          <Card>
            <SectionTitle
              right={
                existing ? <Badge tone="good">{t("Saved")}</Badge> : <Badge>{t("Optional")}</Badge>
              }
            >
              {t("Daily check-in")}
            </SectionTitle>
            <div className="space-y-4">
              {REVIEW_FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium">{t(f.label)}</span>
                    <span className="text-sm font-semibold text-[var(--accent)]">
                      {review[f.key] as number}
                    </span>
                  </div>
                  <ScaleInput
                    value={review[f.key] as number}
                    onChange={(v) => setReview((r) => ({ ...r, [f.key]: v }))}
                  />
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={t("Went well")}>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={review.wentWell ?? ""}
                    onChange={(e) => setReview((r) => ({ ...r, wentWell: e.target.value }))}
                  />
                </Field>
                <Field label={t("Went badly")}>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={review.wentBad ?? ""}
                    onChange={(e) => setReview((r) => ({ ...r, wentBad: e.target.value }))}
                  />
                </Field>
                <Field label={t("Better tomorrow")}>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={review.improveTomorrow ?? ""}
                    onChange={(e) =>
                      setReview((r) => ({ ...r, improveTomorrow: e.target.value }))
                    }
                  />
                </Field>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="soft" onClick={save}>
                  <Save size={16} /> {t("Save check-in")}
                </Button>
                {savedFlash && (
                  <span className="text-sm text-[var(--good)]">{t("Saved ✓")}</span>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar: projected score + sleep */}
        <div className="flex flex-col gap-[18px] lg:sticky lg:top-[92px]">
          <Card>
            <p className="slabel">{t("Projected score")}</p>
            <div className="mb-[18px] mt-1.5 flex items-baseline gap-2.5">
              <span
                className="num text-[56px] font-bold leading-none tracking-[-0.03em]"
                style={{ color: scoreColor(projected) }}
              >
                {projected}
              </span>
              <span className="text-sm font-semibold" style={{ color: scoreColor(projected) }}>
                {projected > 0 ? t(scoreLabel(projected)) : t("No data yet")}
              </span>
            </div>
            <div className="mb-5 h-[10px] overflow-hidden rounded-[6px] bg-[var(--ring-track)]">
              <div className="grad h-full rounded-[6px]" style={{ width: `${projected}%`, transition: "width .5s ease" }} />
            </div>
            <div className="flex flex-col gap-3 text-[13px]">
              <Row label={t("goals done")} value={`${doneCount}/${build.length}`} />
              <Row label={t("Watch-list")} value={String(slipCount)} />
              <Row label={t("Daily check-in")} value={checkinAvg} />
            </div>
            <div className="mt-[22px]">
              <Button className="w-full !py-3" onClick={save}>
                <Save size={16} /> {t("Save check-in")}
              </Button>
              {savedFlash && (
                <p className="mt-2 text-center text-sm text-[var(--good)]">{t("Saved ✓")}</p>
              )}
            </div>
          </Card>
          <Card>
            <SectionTitle>{t("Sleep")}</SectionTitle>
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              {data.sleep.find((s) => s.date === date)
                ? t("Logged for last night.")
                : t("Not logged for last night.")}
            </p>
            <Link href="/sleep">
              <Button variant="soft" size="sm">
                <Moon size={16} /> {t("Log sleep")}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="num font-semibold">{value}</span>
    </div>
  );
}
