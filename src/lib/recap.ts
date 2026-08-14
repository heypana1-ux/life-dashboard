import { AppData, AreaKey, DayScore } from "./types";
import { habitsForToday } from "./habitView";
import { sleepDurationMinutes, addDays, weekdayOf } from "./date";

/*
  Data for the animated recaps: a single day (used by the end-of-day flow) and a period
  (week / month) summary. All derived from what the user logged.
*/

export interface DayRecap {
  score: number;
  builds: { id: string; name: string; done: boolean }[];
  reduces: { id: string; name: string; slipped: boolean }[];
}

export function dayRecap(data: AppData, byDate: Map<string, DayScore>, date: string): DayRecap {
  const items = habitsForToday(data, date);
  const builds = items
    .filter((g) => g.habit.kind === "build")
    .map((g) => ({ id: g.habit.id, name: g.habit.name, done: !!g.log?.done }));
  const reduces = items
    .filter((g) => g.habit.kind === "reduce")
    .map((g) => ({ id: g.habit.id, name: g.habit.name, slipped: !!g.log?.done }));
  return { score: byDate.get(date)?.lifeScore ?? 0, builds, reduces };
}

export interface PeriodRecap {
  avgScore: number;
  trend: number; // vs the previous equal-length period
  daysLogged: number;
  totalDays: number;
  bestDay: { date: string; score: number } | null;
  workouts: number;
  sleepAvgMin: number;
  topArea: { key: AreaKey; value: number } | null;
  habitRate: number; // 0..100, build-habit completion across the period
}

const AREAS: AreaKey[] = ["productivity", "sport", "sleep", "habits", "learning", "creativity", "reflection", "finances"];

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Aggregate stats for [startISO, endISO] inclusive; trend compares the preceding window. */
export function periodRecap(
  data: AppData,
  byDate: Map<string, DayScore>,
  startISO: string,
  endISO: string,
): PeriodRecap {
  const range: string[] = [];
  for (let d = startISO; d <= endISO; d = addDays(d, 1)) range.push(d);
  const scored = range.map((d) => byDate.get(d)).filter((h): h is DayScore => !!h && h.lifeScore > 0);

  const avgScore = Math.round(mean(scored.map((h) => h.lifeScore)));
  const bestDay = scored.length
    ? scored.reduce((m, h) => (h.lifeScore > m.lifeScore ? h : m))
    : null;

  // Previous equal-length window for the trend.
  const len = range.length;
  const prevEnd = addDays(startISO, -1);
  const prevStart = addDays(prevEnd, -(len - 1));
  const prevScored: number[] = [];
  for (let d = prevStart; d <= prevEnd; d = addDays(d, 1)) {
    const h = byDate.get(d);
    if (h && h.lifeScore > 0) prevScored.push(h.lifeScore);
  }
  const trend = prevScored.length ? avgScore - Math.round(mean(prevScored)) : 0;

  const rangeSet = new Set(range);
  const workouts = data.workouts.filter((w) => rangeSet.has(w.date)).length;
  const sleeps = data.sleep.filter((s) => rangeSet.has(s.date));
  const sleepAvgMin = Math.round(mean(sleeps.map((s) => sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0))));

  // Top area by average category value across the window.
  let topArea: { key: AreaKey; value: number } | null = null;
  for (const a of AREAS) {
    const xs = scored.map((h) => h.categories[a]).filter((v): v is number => v != null);
    if (xs.length >= 2) {
      const v = mean(xs);
      if (!topArea || v > topArea.value) topArea = { key: a, value: Math.round(v) };
    }
  }

  // Build-habit completion across the window.
  let due = 0;
  let done = 0;
  for (const d of range) {
    for (const g of habitsForToday(data, d)) {
      if (g.habit.kind !== "build") continue;
      due += 1;
      if (g.log?.done) done += 1;
    }
  }
  const habitRate = due > 0 ? Math.round((done / due) * 100) : 0;

  return {
    avgScore,
    trend,
    daysLogged: scored.length,
    totalDays: range.length,
    bestDay: bestDay ? { date: bestDay.date, score: bestDay.lifeScore } : null,
    workouts,
    sleepAvgMin,
    topArea,
    habitRate,
  };
}

/** The 7-day window ending on `end` (inclusive). */
export function weekRange(end: string): { start: string; end: string } {
  return { start: addDays(end, -6), end };
}

/** The most recent Sunday on or before `date` — a stable key for "this week". */
export function weekAnchor(date: string): string {
  return addDays(date, -weekdayOf(date));
}

/** The calendar month containing `ref` (YYYY-MM-DD) → its first/last day. */
export function monthRange(ref: string): { start: string; end: string } {
  const [y, m] = ref.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
