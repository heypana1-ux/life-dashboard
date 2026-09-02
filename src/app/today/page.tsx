"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Moon, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { habitsForToday } from "@/lib/habitView";
import { todayISO, fmtLong, addDays } from "@/lib/date";
import { DailyReview } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { computeDay, scoreColor, scoreLabel } from "@/lib/score";
import {
  PageHeader,
  Button,
  Badge,
  Toggle,
  FocusZone,
  HairlineStats,
  SectionHead,
} from "@/components/ui";
import { HabitRow } from "@/components/HabitRow";
import { BackfillNudge } from "@/components/BackfillNudge";

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

const TRIGGERS = ["Stress", "Boredom", "Tiredness", "Social", "Hunger", "Craving", "Emotions", "Habit"];

/** 10-segment 1..10 rating bar (Pulse). */
function RatingBar({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: 10 }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i + 1)}
          aria-label={String(i + 1)}
          className="h-1.5 flex-1 rounded-full transition"
          style={{ background: i < value ? "linear-gradient(135deg,var(--area-a),var(--area-b))" : "var(--surface-2)" }}
        />
      ))}
    </div>
  );
}

const textAreaCls =
  "mt-1.5 w-full resize-none rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13px] leading-[1.45] outline-none focus:border-[var(--accent)]";

export default function TodayPage() {
  const { data, saveReview, setHabitLog, updateSettings } = useStore();
  const t = useT();
  const today = todayISO();
  const [date, setDate] = useState(today);

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
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReview(data.reviews.find((r) => r.date === date) ?? blankReview(date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  const [savedFlash, setSavedFlash] = useState(false);
  const checkinCounts = data.settings.checkinCounts ?? false;
  const [checkinOpen, setCheckinOpen] = useState(!!existing || checkinCounts);

  function save() {
    saveReview({ ...review, date });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }
  function setTrigger(habitId: string, trigger: string | undefined) {
    setHabitLog({ habitId, date, done: true, trigger });
  }

  const projected = comp.lifeScore ?? 0;
  const doneCount = build.filter((g) => g.log?.done).length;
  const slipCount = reduce.filter((g) => g.log?.done).length;
  const checkinAvg = existing
    ? ((existing.productivity + existing.mood + existing.energy + existing.satisfaction + existing.discipline) / 5).toFixed(1)
    : "—";
  const occurred = reduce.filter((g) => g.log?.done);
  const sleepLogged = !!data.sleep.find((s) => s.date === date);
  const isToday = date === today;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        kicker={`${doneCount}/${build.length} ${t("goals done")}`}
        title={isToday ? t("Today") : t("Edit day")}
        subtitle={fmtLong(date)}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setDate((d) => addDays(d, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--accent)]"
              aria-label={t("Move left")}
            >
              <ChevronLeft size={18} />
            </button>
            <label className="relative flex items-center">
              <CalendarDays size={14} className="pointer-events-none absolute left-2.5 text-[var(--text-faint)]" />
              <input
                type="date"
                max={today}
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="rounded-[11px] border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-8 pr-2 text-sm outline-none"
              />
            </label>
            <button
              onClick={() => setDate((d) => (d < today ? addDays(d, 1) : d))}
              disabled={isToday}
              className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] enabled:hover:border-[var(--accent)] disabled:opacity-40"
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

      <div className="flex flex-col gap-6">
        <BackfillNudge />

        {/* Focus zone: projected score */}
        <section>
          <FocusZone
            label={t("Projected score")}
            value={projected}
            sub={projected > 0 ? t(scoreLabel(projected)) : t("No data yet")}
            subColor={projected > 0 ? scoreColor(projected) : "var(--text-faint)"}
            progress={projected}
          />
          <HairlineStats
            items={[
              { label: t("goals done"), value: `${doneCount}/${build.length}` },
              { label: t("Watch-list"), value: String(slipCount), color: slipCount > 0 ? "var(--bad)" : undefined },
              { label: t("Daily check-in"), value: checkinAvg },
            ]}
          />
        </section>

        {/* Goals */}
        <section>
          <SectionHead right={<span className="text-xs text-[var(--text-faint)]">{doneCount}/{build.length} {t("done").toLowerCase()}</span>}>
            {t("Goals")}
          </SectionHead>
          {build.length === 0 ? (
            <p className="py-2 text-sm text-[var(--text-muted)]">
              {t("No habits scheduled today")}.{" "}
              <Link href="/habits" className="area-text font-medium">{t("Habits")}</Link>
            </p>
          ) : (
            <div className="flex flex-col">
              {build.map((g) => <HabitRow key={g.habit.id} item={g} date={date} showAmount />)}
            </div>
          )}
        </section>

        {/* Watch-list */}
        {reduce.length > 0 && (
          <section>
            <SectionHead right={<Badge tone="bad">{t("Reduce")}</Badge>}>{t("Watch-list")}</SectionHead>
            <p className="-mt-1 mb-2 text-[11.5px] text-[var(--text-faint)]">
              {t("Tap only if the behavior happened today. Avoided by default.")}
            </p>
            <div className="flex flex-col">
              {reduce.map((g) => <HabitRow key={g.habit.id} item={g} date={date} />)}
            </div>
            {occurred.length > 0 && (
              <div className="mt-3">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  {t("What triggered it? (optional)")}
                </div>
                <div className="mt-2 space-y-3">
                  {occurred.map((g) => (
                    <div key={g.habit.id}>
                      <div className="mb-1.5 text-[13px] font-medium">{g.habit.name}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {TRIGGERS.map((tr) => {
                          const on = g.log?.trigger === tr;
                          return (
                            <button
                              key={tr}
                              onClick={() => setTrigger(g.habit.id, on ? undefined : tr)}
                              className={on
                                ? "area-grad rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                                : "rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--text-muted)] hover:border-[var(--accent)]"}
                            >
                              {t(tr)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <p className="text-[10.5px] leading-[1.5] text-[var(--text-dim)]">
                    {t("Noticing your triggers helps you and the coach spot patterns.")}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Daily check-in */}
        <section>
          <button type="button" onClick={() => setCheckinOpen((o) => !o)} className="w-full" aria-expanded={checkinOpen}>
            <SectionHead
              right={
                <span className="flex items-center gap-1.5">
                  {existing ? <Badge tone="good">{t("Saved")}</Badge> : <Badge>{t("Optional")}</Badge>}
                  {checkinCounts && <Badge tone="accent">{t("Counts")}</Badge>}
                  <ChevronDown size={16} className={`text-[var(--text-faint)] transition-transform ${checkinOpen ? "rotate-180" : ""}`} />
                </span>
              }
            >
              {t("Daily check-in")}
            </SectionHead>
          </button>

          {checkinOpen && (
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold">{t("Count toward Life Score")}</div>
                  <p className="mt-0.5 text-[11.5px] leading-[1.45] text-[var(--text-muted)]">
                    {t("When on, your ratings gently influence the score. Off by default.")}
                  </p>
                </div>
                <Toggle checked={checkinCounts} onChange={(v) => updateSettings({ checkinCounts: v })} />
              </div>

              <div className="flex flex-col gap-3">
                {REVIEW_FIELDS.map((f) => (
                  <div key={f.key}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[13px] font-medium">{t(f.label)}</span>
                      <span className="area-text text-[13px] font-semibold">{review[f.key] as number}</span>
                    </div>
                    <RatingBar value={review[f.key] as number} onChange={(v) => setReview((r) => ({ ...r, [f.key]: v }))} />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2.5">
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">{t("Went well")}</div>
                  <textarea rows={2} className={textAreaCls} value={review.wentWell ?? ""} onChange={(e) => setReview((r) => ({ ...r, wentWell: e.target.value }))} />
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">{t("Went badly")}</div>
                  <textarea rows={2} className={textAreaCls} value={review.wentBad ?? ""} onChange={(e) => setReview((r) => ({ ...r, wentBad: e.target.value }))} />
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">{t("Better tomorrow")}</div>
                  <textarea rows={2} className={textAreaCls} value={review.improveTomorrow ?? ""} onChange={(e) => setReview((r) => ({ ...r, improveTomorrow: e.target.value }))} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button className="w-full !py-3" onClick={save}>
                  <Save size={16} /> {t("Save check-in")}
                </Button>
              </div>
              {savedFlash && <p className="text-center text-sm text-[var(--good)]">{t("Saved ✓")}</p>}
            </div>
          )}
        </section>

        {/* Sleep nudge */}
        {!sleepLogged && (
          <Link href="/sleep" className="block">
            <div className="flex items-center gap-3 rounded-[18px] border p-4" style={{ background: "color-mix(in srgb, #38bdf8 14%, var(--surface))", borderColor: "color-mix(in srgb, #38bdf8 30%, transparent)" }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/10 text-[#0ea5e9] dark:text-[#38bdf8]">
                <Moon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">{t("Not logged for last night.")}</div>
                <div className="text-[11.5px] text-[var(--text-muted)]">{t("Log last night to sharpen tomorrow's score.")}</div>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[#0ea5e9] dark:text-[#38bdf8]">{t("Log sleep")}</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
