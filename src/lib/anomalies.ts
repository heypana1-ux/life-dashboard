import { AppData, DayScore } from "./types";
import { habitsForToday } from "./habitView";
import { addDays, sleepDurationMinutes, todayISO } from "./date";

/*
  Lightweight anomaly detection: compares a recent window (last 7 days) against a baseline
  window (the preceding ~3 weeks) for a handful of tracked metrics, and flags meaningful
  deviations. This is descriptive, not diagnostic — "your sleep is well below your usual",
  never a medical claim. Everything is derived from what the user logged.
*/

export interface Anomaly {
  id: string;
  metric: string; // English i18n key, e.g. "Sleep"
  dir: "up" | "down";
  pct: number; // magnitude of change, positive integer
  tone: "good" | "warn";
  recent: string; // formatted current value
  usual: string; // formatted baseline value
}

const RECENT_DAYS = 7;
const BASE_DAYS = 21; // the 21 days before the recent window
const MIN_PCT = 15;

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

interface MetricDef {
  metric: string;
  /** Value for a given ISO date, or null if not logged that day. */
  valueOf: (date: string) => number | null;
  /** Higher is better? (up = good) */
  moreIsBetter: boolean;
  minRecent: number;
  minBase: number;
  fmt: (v: number) => string;
}

export function detectAnomalies(data: AppData, history: DayScore[]): Anomaly[] {
  const today = todayISO();
  const recentDates = Array.from({ length: RECENT_DAYS }, (_, i) => addDays(today, -i));
  const baseDates = Array.from({ length: BASE_DAYS }, (_, i) => addDays(today, -(RECENT_DAYS + i)));

  const scoreBy = new Map(history.map((h) => [h.date, h]));
  const sleepBy = new Map(data.sleep.map((s) => [s.date, s]));
  const healthBy = new Map(data.health.map((h) => [h.date, h]));
  const reviewBy = new Map(data.reviews.map((r) => [r.date, r]));

  // Per-day build-habit completion rate (0..100). Only for days that had scheduled habits.
  const habitRateOf = (date: string): number | null => {
    const items = habitsForToday(data, date).filter((g) => g.habit.kind === "build");
    if (items.length === 0) return null;
    const done = items.filter((g) => g.log?.done).length;
    return (done / items.length) * 100;
  };

  const defs: MetricDef[] = [
    {
      metric: "Life Score",
      valueOf: (d) => (scoreBy.get(d)?.lifeScore ? scoreBy.get(d)!.lifeScore : null),
      moreIsBetter: true,
      minRecent: 3,
      minBase: 6,
      fmt: (v) => String(Math.round(v)),
    },
    {
      metric: "Sleep",
      valueOf: (d) => {
        const s = sleepBy.get(d);
        return s ? sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0) : null;
      },
      moreIsBetter: true,
      minRecent: 3,
      minBase: 6,
      fmt: (v) => `${(v / 60).toFixed(1)}h`,
    },
    {
      metric: "Habits",
      valueOf: habitRateOf,
      moreIsBetter: true,
      minRecent: 3,
      minBase: 6,
      fmt: (v) => `${Math.round(v)}%`,
    },
    {
      metric: "Wellbeing",
      valueOf: (d) => healthBy.get(d)?.wellbeing ?? null,
      moreIsBetter: true,
      minRecent: 3,
      minBase: 5,
      fmt: (v) => `${v.toFixed(1)}/10`,
    },
    {
      metric: "Mood",
      valueOf: (d) => reviewBy.get(d)?.mood ?? null,
      moreIsBetter: true,
      minRecent: 3,
      minBase: 5,
      fmt: (v) => `${v.toFixed(1)}/10`,
    },
  ];

  const out: Anomaly[] = [];
  for (const def of defs) {
    const recent = recentDates.map(def.valueOf).filter((v): v is number => v != null);
    const base = baseDates.map(def.valueOf).filter((v): v is number => v != null);
    if (recent.length < def.minRecent || base.length < def.minBase) continue;
    const rMean = mean(recent);
    const bMean = mean(base);
    if (bMean <= 0) continue;
    const pct = Math.round(((rMean - bMean) / bMean) * 100);
    if (Math.abs(pct) < MIN_PCT) continue;
    const dir: "up" | "down" = pct > 0 ? "up" : "down";
    const good = def.moreIsBetter ? dir === "up" : dir === "down";
    out.push({
      id: def.metric,
      metric: def.metric,
      dir,
      pct: Math.abs(pct),
      tone: good ? "good" : "warn",
      recent: def.fmt(rMean),
      usual: def.fmt(bMean),
    });
  }

  // Training frequency (workouts per week) — count-based, compared as sessions/7 days.
  const wkCount = (dates: string[]) => {
    const set = new Set(dates);
    return data.workouts.filter((w) => set.has(w.date)).length;
  };
  const recentW = wkCount(recentDates);
  const baseWPerWeek = wkCount(baseDates) / (BASE_DAYS / 7);
  if (baseWPerWeek >= 1 && (recentW > 0 || baseWPerWeek >= 2)) {
    const pct = Math.round(((recentW - baseWPerWeek) / baseWPerWeek) * 100);
    if (Math.abs(pct) >= MIN_PCT) {
      const dir: "up" | "down" = pct > 0 ? "up" : "down";
      out.push({
        id: "Training",
        metric: "Training",
        dir,
        pct: Math.abs(pct),
        tone: dir === "up" ? "good" : "warn",
        recent: `${recentW}×`,
        usual: `${baseWPerWeek.toFixed(1)}×`,
      });
    }
  }

  // Surface the most pronounced deviations first; keep the list short.
  return out.sort((a, b) => b.pct - a.pct).slice(0, 4);
}
