import { AppData, AreaKey, DayScore } from "./types";
import { AREA_LABELS } from "./defaults";
import { computeLevel } from "./level";
import { computeAchievements } from "./achievements";
import { addDays, sleepDurationMinutes } from "./date";

/*
  "Year in review" (Wrapped) — a celebratory, end-of-year summary built entirely from what
  the user logged during the given calendar year. Descriptive and motivational; no claims.
*/

export interface YearWrapped {
  year: number;
  hasData: boolean;
  daysLogged: number;
  avgScore: number;
  bestDay: { date: string; score: number } | null;
  longestStreak: number;
  workouts: number;
  workoutMinutes: number;
  distanceKm: number;
  journalEntries: number;
  sleepAvgMin: number;
  topHabit: { name: string; count: number } | null;
  topArea: { key: AreaKey; value: number } | null;
  bestMonth: { monthIndex: number; avg: number } | null;
  level: number;
  totalXP: number;
  achievements: number;
}

const AREAS: AreaKey[] = ["productivity", "sport", "sleep", "habits", "learning", "creativity", "reflection", "finances"];

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function availableWrapYears(data: AppData, history: DayScore[]): number[] {
  const years = new Set<number>();
  for (const h of history) if (h.lifeScore > 0) years.add(Number(h.date.slice(0, 4)));
  for (const w of data.workouts) years.add(Number(w.date.slice(0, 4)));
  for (const j of data.journal) years.add(Number(j.date.slice(0, 4)));
  return [...years].filter((y) => y > 2000).sort((a, b) => b - a);
}

export function buildYearWrapped(data: AppData, history: DayScore[], year: number): YearWrapped {
  const inYear = (d: string) => d.slice(0, 4) === String(year);
  const scored = history.filter((h) => inYear(h.date) && h.lifeScore > 0);

  const avgScore = Math.round(mean(scored.map((h) => h.lifeScore)));
  const bestDay = scored.length ? scored.reduce((m, h) => (h.lifeScore > m.lifeScore ? h : m)) : null;

  // Longest run of consecutive calendar days with a positive score, within the year.
  const sorted = [...scored].sort((a, b) => (a.date < b.date ? -1 : 1));
  let longest = 0;
  let run = 0;
  let prev = "";
  for (const h of sorted) {
    if (prev && addDays(prev, 1) === h.date) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = h.date;
  }

  const workoutsY = data.workouts.filter((w) => inYear(w.date));
  const workoutMinutes = Math.round(workoutsY.reduce((s, w) => s + (w.durationMin || 0), 0));
  const distanceKm = Math.round(workoutsY.reduce((s, w) => s + (w.distanceKm || 0), 0));

  const journalEntries = data.journal.filter((j) => inYear(j.date)).length;

  const sleepsY = data.sleep.filter((s) => inYear(s.date));
  const sleepAvgMin = Math.round(mean(sleepsY.map((s) => sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0))));

  // Top habit by completions in the year.
  const habitCounts = new Map<string, number>();
  for (const l of data.habitLogs) if (inYear(l.date) && l.done) habitCounts.set(l.habitId, (habitCounts.get(l.habitId) ?? 0) + 1);
  let topHabit: YearWrapped["topHabit"] = null;
  for (const [id, count] of habitCounts) {
    const h = data.habits.find((x) => x.id === id);
    if (h && (!topHabit || count > topHabit.count)) topHabit = { name: h.name, count };
  }

  // Top area by average category value.
  let topArea: YearWrapped["topArea"] = null;
  for (const a of AREAS) {
    const xs = scored.map((h) => h.categories[a]).filter((v): v is number => v != null);
    if (xs.length >= 5) {
      const v = mean(xs);
      if (!topArea || v > topArea.value) topArea = { key: a, value: Math.round(v) };
    }
  }

  // Best month by average score.
  const byMonth = new Map<number, number[]>();
  for (const h of scored) {
    const m = Number(h.date.slice(5, 7)) - 1;
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(h.lifeScore);
  }
  let bestMonth: YearWrapped["bestMonth"] = null;
  for (const [m, xs] of byMonth) {
    if (xs.length >= 3) {
      const avg = Math.round(mean(xs));
      if (!bestMonth || avg > bestMonth.avg) bestMonth = { monthIndex: m, avg };
    }
  }

  const level = computeLevel(data, history);
  const achievements = computeAchievements(data, history).filter((a) => a.unlocked).length;

  return {
    year,
    hasData: scored.length > 0 || workoutsY.length > 0 || journalEntries > 0,
    daysLogged: scored.length,
    avgScore,
    bestDay: bestDay ? { date: bestDay.date, score: bestDay.lifeScore } : null,
    longestStreak: longest,
    workouts: workoutsY.length,
    workoutMinutes,
    distanceKm,
    journalEntries,
    sleepAvgMin,
    topHabit,
    topArea: topArea ? { key: topArea.key, value: topArea.value } : null,
    bestMonth,
    level: level.level,
    totalXP: level.xp,
    achievements,
  };
}

export function areaLabelKey(key: AreaKey): string {
  return AREA_LABELS[key];
}
