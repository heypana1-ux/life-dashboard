"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Dumbbell, Moon, BookOpen, ListChecks, ClipboardCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { AREA_LABELS } from "@/lib/defaults";
import { computeDay, scoreColor, scoreLabel } from "@/lib/score";
import { fmtDuration, fmtLong, monthLabel, sleepDurationMinutes, todayISO, weekdayLabel } from "@/lib/date";
import { Card, PageHeader, Modal, Badge } from "@/components/ui";
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
      <PageHeader title={t("Calendar")} subtitle={t("Your life, day by day — tap a day to see everything you logged.")} />

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
                  background:
                    score !== null && score > 0
                      ? `color-mix(in srgb, ${scoreColor(score)} 22%, var(--surface))`
                      : "var(--surface-2)",
                }}
              >
                <span className="font-medium">{dayNum}</span>
                {score !== null && score > 0 && (
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full" style={{ background: scoreColor(score) }} />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-[var(--text-faint)]">
          <Legend color="var(--bad)" label={t("Rough")} />
          <Legend color="var(--warn)" label={t("Mixed")} />
          <Legend color="var(--good)" label={t("Strong")} />
        </div>
      </Card>

      <DayDetail date={selected} onClose={() => setSelected(null)} />
    </div>
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
            {cats.map(([k, v]) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{t(AREA_LABELS[k])}</span>
                  <span className="font-semibold">{v}</span>
                </div>
                <Meter value={v} />
              </div>
            ))}
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
