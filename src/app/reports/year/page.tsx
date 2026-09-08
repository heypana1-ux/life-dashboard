"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { fmtDuration, fmtLong, monthLabelLong, sleepDurationMinutes, todayISO } from "@/lib/date";
import { availableWrapYears, buildYearWrapped } from "@/lib/yearWrapped";
import { personalRecords } from "@/lib/trainingStats";
import { healthScore, symptomCount } from "@/lib/health";
import { AREA_LABELS } from "@/lib/defaults";
import { AreaKey } from "@/lib/types";
import { Button, Chip, EmptyState, PageHeader } from "@/components/ui";

/*
  A year on one document.

  This is the printable counterpart to the Wrapped overlay: no animation, no confetti, just the
  numbers laid out so they survive being put on paper or handed to a coach or a doctor. "Save
  as PDF" opens the browser's own print dialog — that keeps the text selectable and the file
  small, where rendering the page to an image would give a fuzzy, unsearchable scan of itself.
*/

export default function YearReportPage() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const years = useMemo(() => availableWrapYears(data, d.history), [data, d.history]);
  const [year, setYear] = useState<number>(() => years[0] ?? new Date().getFullYear());
  const active = years.includes(year) ? year : (years[0] ?? year);

  const y = useMemo(() => buildYearWrapped(data, d.history, active), [data, d.history, active]);
  const inYear = useMemo(() => (s: string) => s.slice(0, 4) === String(active), [active]);

  /* ---- Month by month ---- */
  const months = useMemo(() => {
    const rows: { m: number; days: number; avg: number; workouts: number; sleep: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const key = `${active}-${String(m + 1).padStart(2, "0")}`;
      const scored = d.history.filter((h) => h.date.startsWith(key) && h.lifeScore > 0);
      const w = data.workouts.filter((x) => x.date.startsWith(key));
      const sl = data.sleep.filter((x) => x.date.startsWith(key));
      const sleepMin = sl.length
        ? Math.round(sl.reduce((s, x) => s + sleepDurationMinutes(x.bedTime, x.wakeTime, x.fallAsleepMinutes ?? 0), 0) / sl.length)
        : 0;
      if (scored.length === 0 && w.length === 0 && sl.length === 0) continue;
      rows.push({
        m,
        days: scored.length,
        avg: scored.length ? Math.round(scored.reduce((s, h) => s + h.lifeScore, 0) / scored.length) : 0,
        workouts: w.length,
        sleep: sleepMin,
      });
    }
    return rows;
  }, [d.history, data.workouts, data.sleep, active]);

  /* ---- Habits: how often each one actually happened ---- */
  const habits = useMemo(() => {
    const logs = data.habitLogs.filter((l) => inYear(l.date) && l.done);
    return data.habits
      .map((h) => {
        const done = logs.filter((l) => l.habitId === h.id).length;
        const tracked = new Set(data.habitLogs.filter((l) => l.habitId === h.id && inYear(l.date)).map((l) => l.date)).size;
        return { name: h.name, kind: h.kind, done, tracked };
      })
      .filter((h) => h.done > 0 || h.tracked > 0)
      .sort((a, b) => b.done - a.done);
  }, [data.habits, data.habitLogs, inYear]);

  /* ---- Training ---- */
  const training = useMemo(() => {
    const ws = data.workouts.filter((w) => inYear(w.date));
    const bySport = new Map<string, { n: number; min: number }>();
    for (const w of ws) {
      const cur = bySport.get(w.sport) ?? { n: 0, min: 0 };
      cur.n += 1;
      cur.min += w.durationMin || 0;
      bySport.set(w.sport, cur);
    }
    return {
      sports: [...bySport.entries()].map(([sport, v]) => ({ sport, ...v })).sort((a, b) => b.n - a.n),
      records: personalRecords(ws).slice(0, 10),
    };
  }, [data.workouts, inYear]);

  /* ---- Sleep & health ---- */
  const sleep = useMemo(() => {
    const sl = data.sleep.filter((s) => inYear(s.date));
    if (sl.length === 0) return null;
    const mean = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
    return {
      nights: sl.length,
      avgMin: Math.round(sl.reduce((s, x) => s + sleepDurationMinutes(x.bedTime, x.wakeTime, x.fallAsleepMinutes ?? 0), 0) / sl.length),
      quality: mean(sl.map((s) => s.quality)),
      energy: mean(sl.map((s) => s.morningEnergy)),
    };
  }, [data.sleep, inYear]);

  const health = useMemo(() => {
    const hs = data.health.filter((h) => inYear(h.date));
    if (hs.length === 0) return null;
    const counts = new Map<string, number>();
    for (const h of hs) for (const [k, v] of Object.entries(h.symptoms ?? {})) if (v > 0) counts.set(k, (counts.get(k) ?? 0) + 1);
    return {
      days: hs.length,
      avg: Math.round(hs.reduce((s, h) => s + healthScore(h), 0) / hs.length),
      sickDays: hs.filter((h) => h.sick).length,
      symptomDays: hs.filter((h) => symptomCount(h.symptoms) > 0).length,
      top: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [data.health, inYear]);

  const goals = useMemo(() => {
    const gs = (data.goals ?? []).filter((g) => !g.archived || inYear(g.createdAt?.slice(0, 10) ?? ""));
    return { total: gs.length, done: gs.filter((g) => g.progress >= 100).length };
  }, [data.goals, inYear]);

  if (years.length === 0) {
    return (
      <div className="space-y-[14px]">
        <PageHeader kicker={t("Reports")} title={t("Year report")} />
        <EmptyState icon={<Printer size={26} />} title={t("Nothing to report yet")} hint={t("Log a few weeks and a full year report appears here.")} />
      </div>
    );
  }

  return (
    <div className="space-y-[14px]">
      <div className="no-print">
        <PageHeader
          kicker={t("Reports")}
          title={t("Year report")}
          subtitle={t("A printable summary of everything you logged. Save it as a PDF from the print dialog.")}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {years.map((yr) => (
              <Chip key={yr} active={yr === active} onClick={() => setYear(yr)}>
                {yr}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <Link href="/reports">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={15} /> {t("Back")}
              </Button>
            </Link>
            <Button size="sm" onClick={() => window.print()}>
              <Printer size={15} /> {t("Save as PDF")}
            </Button>
          </div>
        </div>
      </div>

      {/* Everything below is what actually lands on the page. */}
      <div className="print-doc rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <header className="border-b border-[var(--border)] pb-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
            Life Dashboard · {t("Year report")}
          </div>
          <h1 className="mt-1 text-[30px] font-bold tracking-[-0.02em]">{active}</h1>
          <div className="mt-1 text-[12.5px] text-[var(--text-muted)]">
            {data.settings.profile.name ? `${data.settings.profile.name} · ` : ""}
            {t("Generated {date}", { date: fmtLong(todayISO()) })}
          </div>
        </header>

        <Section title={t("The year in numbers")}>
          <Grid>
            <Stat label={t("Days logged")} value={String(y.daysLogged)} />
            <Stat label={t("Average Life Score")} value={y.avgScore ? String(y.avgScore) : "—"} />
            <Stat label={t("Longest streak")} value={`${y.longestStreak} ${t("days")}`} />
            <Stat label={t("Life Rating")} value={d.history.length ? String(d.history[d.history.length - 1].elo) : "—"} />
            <Stat label={t("Workouts")} value={String(y.workouts)} />
            <Stat label={t("Training time")} value={y.workoutMinutes ? fmtDuration(y.workoutMinutes) : "—"} />
            <Stat label={t("Distance")} value={y.distanceKm ? `${y.distanceKm} km` : "—"} />
            <Stat label={t("Journal entries")} value={String(y.journalEntries)} />
            <Stat label={t("Average sleep")} value={y.sleepAvgMin ? fmtDuration(y.sleepAvgMin) : "—"} />
            <Stat label={t("Level")} value={String(y.level)} />
            <Stat label={t("Achievements")} value={String(y.achievements)} />
            <Stat label={t("Goals reached")} value={`${goals.done}/${goals.total}`} />
          </Grid>
          {(y.bestMonth || y.topArea || y.topHabit) && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
              {y.bestMonth && `${t("Strongest month")}: ${t(monthLabelLong(y.bestMonth.monthIndex))} (${y.bestMonth.avg}). `}
              {y.topArea && `${t("Strongest area")}: ${t(AREA_LABELS[y.topArea.key as AreaKey])} (${y.topArea.value}). `}
              {y.topHabit && `${t("Most consistent habit")}: ${y.topHabit.name} (${y.topHabit.count}×).`}
            </p>
          )}
        </Section>

        {months.length > 0 && (
          <Section title={t("Month by month")}>
            <Table
              head={[t("Month"), t("Days"), t("Ø Score"), t("Workouts"), t("Ø Sleep")]}
              rows={months.map((m) => [
                t(monthLabelLong(m.m)),
                String(m.days),
                m.avg ? String(m.avg) : "—",
                String(m.workouts),
                m.sleep ? fmtDuration(m.sleep) : "—",
              ])}
            />
          </Section>
        )}

        {habits.length > 0 && (
          <Section title={t("Habits")}>
            <Table
              head={[t("Habit"), t("Type"), t("Days done"), t("Days tracked")]}
              rows={habits.map((h) => [h.name, h.kind === "reduce" ? t("Reduce") : t("Build"), String(h.done), String(h.tracked)])}
            />
          </Section>
        )}

        {training.sports.length > 0 && (
          <Section title={t("Training")}>
            <Table
              head={[t("Sport"), t("Sessions"), t("Time")]}
              rows={training.sports.map((s) => [s.sport, String(s.n), fmtDuration(s.min)])}
            />
            {training.records.length > 0 && (
              <>
                <div className="mt-4 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  {t("Personal records")}
                </div>
                <Table
                  head={[t("Exercise"), t("Best set"), t("Estimated 1RM")]}
                  rows={training.records.map((r) => [r.name, `${r.weight} kg × ${r.reps}`, `${r.best1RM} kg`])}
                />
              </>
            )}
          </Section>
        )}

        {sleep && (
          <Section title={t("Sleep")}>
            <Grid>
              <Stat label={t("Nights logged")} value={String(sleep.nights)} />
              <Stat label={t("Average duration")} value={fmtDuration(sleep.avgMin)} />
              <Stat label={t("Average quality")} value={`${sleep.quality}/10`} />
              <Stat label={t("Morning energy")} value={`${sleep.energy}/10`} />
            </Grid>
          </Section>
        )}

        {health && (
          <Section title={t("Health")}>
            <Grid>
              <Stat label={t("Days logged")} value={String(health.days)} />
              <Stat label={t("Average wellbeing")} value={String(health.avg)} />
              <Stat label={t("Days with symptoms")} value={String(health.symptomDays)} />
              <Stat label={t("Sick days")} value={String(health.sickDays)} />
            </Grid>
            {health.top.length > 0 && (
              <p className="mt-3 text-[12.5px] text-[var(--text-muted)]">
                {t("Most frequent")}: {health.top.map(([k, n]) => `${k} (${n})`).join(", ")}
              </p>
            )}
          </Section>
        )}

        <footer className="mt-7 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--text-faint)]">
          {t("Everything here comes from entries you made yourself. Nothing is estimated or filled in.")}
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-section mt-6">
      <h2 className="mb-2.5 text-[15px] font-bold tracking-[-0.01em]">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 sm:grid-cols-3">{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border)] pb-1.5">
      <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
      <span className="num text-[14px] font-bold tabular-nums">{value}</span>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className={`border-b border-[var(--border)] pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)] ${
                  i === 0 ? "text-left" : "text-right"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={`border-b border-[var(--surface-2)] py-1.5 ${j === 0 ? "text-left" : "text-right tabular-nums"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
