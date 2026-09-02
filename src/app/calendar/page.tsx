"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Dumbbell, Moon, BookOpen, ListChecks, ClipboardCheck, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { AREA_LABELS } from "@/lib/defaults";
import { AREA_COLORS, AREA_ICONS } from "@/lib/areaStyle";
import { dayHasEntry } from "@/lib/dayActivity";
import { habitsForToday } from "@/lib/habitView";
import { computeDay, scoreColor, scoreLabel } from "@/lib/score";
import { AppData } from "@/lib/types";

/* At-a-glance day markers: what happened that day. */
const DAY_MARKS = [
  { key: "trained", color: "#0ea5e9", label: "Training" },
  { key: "habits", color: "#16a34a", label: "Habits" },
  { key: "sleep", color: "#6366f1", label: "Sleep" },
  { key: "journal", color: "#a855f7", label: "Journal" },
] as const;

function dayMarks(data: AppData, date: string): (typeof DAY_MARKS)[number][] {
  const out: (typeof DAY_MARKS)[number][] = [];
  if (data.workouts.some((w) => w.date === date)) out.push(DAY_MARKS[0]);
  const build = habitsForToday(data, date).filter((g) => g.habit.kind === "build");
  const done = build.filter((g) => g.log?.done).length;
  if (build.length > 0 && done / build.length >= 0.6) out.push(DAY_MARKS[1]);
  if (data.sleep.some((s) => s.date === date)) out.push(DAY_MARKS[2]);
  if (data.journal.some((j) => j.date === date)) out.push(DAY_MARKS[3]);
  return out;
}
import { useDerived } from "@/lib/useDerived";
import { weekdayPatterns, weekdayFeelings, feelingHighlight } from "@/lib/weekdayStats";
import { CoachInsightCard } from "@/components/Coach";
import { fmtDuration, fmtLong, monthLabel, sleepDurationMinutes, todayISO, weekdayLabel } from "@/lib/date";
import { Card, PageHeader, SectionTitle, Modal, Badge, Button } from "@/components/ui";
import { Meter } from "@/components/ScoreRing";
import clsx from "clsx";

// Monday-first weekday order.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const { data } = useStore();
  const t = useT();
  const today = todayISO();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);

  const cells = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1).getDay(); // 0=Sun
    const leading = (first + 6) % 7; // days before the 1st in Monday-first grid
    const total = daysInMonth(ym.y, ym.m);
    const arr: (string | null)[] = [];
    for (let i = 0; i < leading; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(iso(ym.y, ym.m, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [ym]);

  function shift(delta: number) {
    setYm((s) => {
      const m = s.m + delta;
      if (m < 0) return { y: s.y - 1, m: 11 };
      if (m > 11) return { y: s.y + 1, m: 0 };
      return { y: s.y, m };
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader kicker={`${t(monthLabel(ym.m))} ${ym.y}`} lead={t("Your")} title={t("Calendar")} subtitle={t("Your life, day by day — tap a day to see everything you logged.")} />

      <Card className="mx-auto max-w-[760px]">
        <div className="mb-[18px] flex items-center justify-between">
          <button onClick={() => shift(-1)} className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]" aria-label={t("Move left")}>
            <ChevronLeft size={18} />
          </button>
          <span className="text-[15px] font-semibold">
            {t(monthLabel(ym.m))} {ym.y}
          </span>
          <button onClick={() => shift(1)} className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]" aria-label={t("Move right")}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_ORDER.map((wd) => (
            <div key={wd} className="pb-1 text-center text-[11px] font-medium uppercase text-[var(--text-faint)]">
              {t(weekdayLabel(wd))}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const comp = computeDay(data, d);
            const score = comp.lifeScore;
            const scored = score !== null && score > 0;
            const logged = !scored && dayHasEntry(data, d); // logged content but no Life Score
            const dayNum = Number(d.slice(8));
            const isToday = d === today;
            const isFuture = d > today;
            return (
              <button
                key={d}
                onClick={() => !isFuture && setSelected(d)}
                disabled={isFuture}
                className={clsx(
                  "flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition",
                  isToday ? "border-[var(--accent)]" : "border-transparent",
                  isFuture ? "opacity-30" : "hover:border-[var(--text-faint)]",
                )}
                style={{
                  background: scored
                    ? `color-mix(in srgb, ${scoreColor(score!)} 22%, var(--surface))`
                    : "var(--surface-2)",
                }}
              >
                <span className="font-medium">{dayNum}</span>
                {(() => {
                  const marks = dayMarks(data, d);
                  if (marks.length > 0) {
                    return (
                      <span className="mt-0.5 flex gap-[3px]">
                        {marks.map((m) => (
                          <span key={m.key} className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} title={t(m.label)} />
                        ))}
                      </span>
                    );
                  }
                  if (logged) return <span className="mt-0.5 h-1.5 w-1.5 rounded-full border border-[var(--text-faint)]" title={t("Logged (no score)")} />;
                  return null;
                })()}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-[var(--text-faint)]">
          {DAY_MARKS.map((m) => (
            <Legend key={m.key} color={m.color} label={t(m.label)} />
          ))}
        </div>
      </Card>

      <WeekdayCard />

      <WeekdayFeelingsCard />

      <DayDetail date={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function WeekdayCard() {
  const d = useDerived();
  const t = useT();
  const p = useMemo(() => weekdayPatterns(d.history), [d.history]);
  if (!p.enough) return null;
  const maxAvg = Math.max(...p.stats.map((s) => s.avg), 1);

  return (
    <Card className="mx-auto max-w-[760px]">
      <SectionTitle>{t("Your week at a glance")}</SectionTitle>
      {p.best && p.worst && p.best.wd !== p.worst.wd && (
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          {t("On average, {best} is your strongest day and {worst} your toughest.", {
            best: t(weekdayLabel(p.best.wd)),
            worst: t(weekdayLabel(p.worst.wd)),
          })}
        </p>
      )}
      <div className="flex items-end justify-between gap-2" style={{ height: 130 }}>
        {p.stats.map((s) => {
          const h = s.n > 0 ? Math.max(6, Math.round((s.avg / maxAvg) * 104)) : 4;
          const isBest = p.best?.wd === s.wd;
          const isWorst = p.worst?.wd === s.wd;
          return (
            <div key={s.wd} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="num text-[11px] font-semibold text-[var(--text-muted)]">{s.n > 0 ? s.avg : "—"}</span>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: h,
                  background: isBest ? "var(--good)" : isWorst ? "var(--warn)" : "var(--accent)",
                  opacity: s.n > 0 ? 1 : 0.3,
                }}
              />
              <span className="text-[11px] text-[var(--text-faint)]">{t(weekdayLabel(s.wd)).slice(0, 2)}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-faint)]">{t("Average Life Score per weekday, from all your logged days.")}</p>
    </Card>
  );
}

const FEEL_WD = [1, 2, 3, 4, 5, 6, 0];

function WeekdayFeelingsCard() {
  const { data } = useStore();
  const t = useT();
  const f = useMemo(() => weekdayFeelings(data.reviews), [data.reviews]);
  if (!f.enough) return null;
  const hi = feelingHighlight(f);
  const cols = "72px repeat(7, 1fr)";
  return (
    <Card className="mx-auto max-w-[760px]">
      <SectionTitle>{t("How you feel by weekday")}</SectionTitle>
      {hi && (
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          {t("Your {metric} varies most across the week — highest on {best}, lowest on {worst}.", {
            metric: t(hi.metricLabel),
            best: t(weekdayLabel(hi.bestWd)),
            worst: t(weekdayLabel(hi.worstWd)),
          })}
        </p>
      )}
      <div className="no-swipe overflow-x-auto">
        <div className="min-w-[440px]">
          <div className="grid gap-1 pb-1" style={{ gridTemplateColumns: cols }}>
            <div />
            {FEEL_WD.map((wd) => (
              <div key={wd} className="text-center text-[11px] font-medium uppercase text-[var(--text-faint)]">
                {t(weekdayLabel(wd)).slice(0, 2)}
              </div>
            ))}
          </div>
          {f.metrics.map((m) => (
            <div key={m.key} className="grid items-center gap-1 py-0.5" style={{ gridTemplateColumns: cols }}>
              <div className="truncate pr-2 text-xs font-medium text-[var(--text-muted)]">{t(m.label)}</div>
              {m.avg.map((v, idx) => {
                const has = f.n[idx] > 0;
                const col = v >= 6.5 ? "var(--good)" : v >= 4.5 ? "var(--warn)" : "var(--bad)";
                return (
                  <div
                    key={idx}
                    className="num flex h-8 items-center justify-center rounded-md text-[11px] font-semibold"
                    style={{
                      background: has ? `color-mix(in srgb, ${col} 26%, var(--surface))` : "var(--surface-2)",
                      color: has ? "var(--text)" : "var(--text-faint)",
                    }}
                  >
                    {has ? v.toFixed(1) : "–"}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-faint)]">
        {t("Average of each check-in metric per weekday (1-10).")}
        {f.total < 14 && " " + t("More daily check-ins will sharpen this.")}
      </p>
      <div className="mt-4">
        <CoachInsightCard
          title={t("What your week says")}
          prompt={t("Looking at how my mood and energy vary by weekday in my check-in data, tell me which days I tend to feel best and worst, and give one practical suggestion for planning my week. Keep it to 2-3 sentences.")}
        />
      </div>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function DayDetail({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { data } = useStore();
  const t = useT();
  if (!date) return null;

  const comp = computeDay(data, date);
  const sleep = data.sleep.find((s) => s.date === date);
  const workouts = data.workouts.filter((w) => w.date === date);
  const review = data.reviews.find((r) => r.date === date);
  const journal = data.journal.filter((j) => j.date === date);
  const doneHabits = data.habitLogs
    .filter((l) => l.date === date && l.done)
    .map((l) => data.habits.find((h) => h.id === l.habitId))
    .filter((h): h is NonNullable<typeof h> => !!h);
  const buildDone = doneHabits.filter((h) => h.kind === "build");
  const slips = doneHabits.filter((h) => h.kind === "reduce");

  const cats = Object.entries(comp.categories) as [keyof typeof AREA_LABELS, number][];

  return (
    <Modal open={!!date} onClose={onClose} title={fmtLong(date)} wide>
      <div className="space-y-4">
        {/* Score */}
        <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--text-faint)]">{t("Life Score")}</div>
            <div className="text-3xl font-bold tabular-nums">{comp.lifeScore ?? "—"}</div>
          </div>
          {comp.lifeScore !== null && comp.lifeScore > 0 && (
            <Badge tone="accent">{t(scoreLabel(comp.lifeScore))}</Badge>
          )}
        </div>

        {cats.length > 0 && (
          <div className="grid grid-cols-2 gap-x-5 gap-y-2">
            {cats.map(([k, v]) => {
              const Icon = AREA_ICONS[k];
              return (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      {Icon && <Icon size={12} style={{ color: AREA_COLORS[k] }} />}
                      {t(AREA_LABELS[k])}
                    </span>
                    <span className="font-semibold">{v}</span>
                  </div>
                  <Meter value={v} color={AREA_COLORS[k]} />
                </div>
              );
            })}
          </div>
        )}

        {sleep && (
          <DetailRow icon={<Moon size={16} />} title={t("Sleep")}>
            {fmtDuration(sleepDurationMinutes(sleep.bedTime, sleep.wakeTime, sleep.fallAsleepMinutes ?? 0))} ·{" "}
            {t("Quality")} {sleep.quality}/10 · {t("Morning energy")} {sleep.morningEnergy}/10
          </DetailRow>
        )}

        {workouts.length > 0 && (
          <DetailRow icon={<Dumbbell size={16} />} title={t("Training")}>
            {workouts.map((w) => `${w.sport} (${fmtDuration(w.durationMin)})`).join(", ")}
          </DetailRow>
        )}

        {buildDone.length > 0 && (
          <DetailRow icon={<ListChecks size={16} />} title={t("Habits")}>
            {buildDone.map((h) => h.name).join(", ")}
          </DetailRow>
        )}

        {slips.length > 0 && (
          <DetailRow icon={<ListChecks size={16} />} title={t("Reduce")}>
            <span className="text-[var(--bad)]">{slips.map((h) => h.name).join(", ")}</span>
          </DetailRow>
        )}

        {review && (
          <DetailRow icon={<ClipboardCheck size={16} />} title={t("Daily check-in")}>
            {t("Productivity")} {review.productivity} · {t("Mood")} {review.mood} · {t("Energy")} {review.energy} ·{" "}
            {t("Satisfaction")} {review.satisfaction} · {t("Discipline")} {review.discipline}
          </DetailRow>
        )}

        {journal.map((j) => (
          <DetailRow key={j.id} icon={<BookOpen size={16} />} title={j.title || t("Journal")}>
            <span className="line-clamp-3 text-[var(--text-muted)]">{j.body}</span>
          </DetailRow>
        ))}

        {!sleep && !workouts.length && !buildDone.length && !review && !journal.length && (
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">{t("Nothing logged this day.")}</p>
        )}

        <div className="border-t border-[var(--border)] pt-4">
          <Link href={`/today?date=${date}`}>
            <Button variant="soft" className="w-full">
              <Pencil size={15} /> {t("Edit this day")}
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-[var(--border)] p-3">
      <span className="mt-0.5 text-[var(--text-faint)]">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-sm text-[var(--text-muted)]">{children}</div>
      </div>
    </div>
  );
}
