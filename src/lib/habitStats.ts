import { AppData, DayScore, Habit } from "./types";
import { isDueOn } from "./score";
import { addDays, isoRange, parseISO, todayISO } from "./date";
import { logOf } from "./habitView";
import { isRestDay } from "./streak";

/*
  Per-habit statistics for motivation: streaks and a GitHub-style heatmap.
  "On track" is defined per habit cadence so a single day-count works for every type:
    - build daily/weekdays: due days must be done; non-due days are free (rest days).
    - build weekly (X/week):  on track if the trailing 7-day window meets the target.
    - reduce:                 on track on days the behavior was avoided.
*/

function metWeeklyTarget(data: AppData, habit: Habit, dateISO: string): boolean {
  const target = habit.schedule.timesPerWeek ?? 1;
  const done = isoRange(dateISO, 7).filter((d) => logOf(data, habit.id, d)?.done).length;
  return done >= target;
}

export function onTrack(data: AppData, habit: Habit, dateISO: string): boolean {
  if (isRestDay(data.settings, dateISO)) return true; // vacation / planned rest
  if (habit.kind === "reduce") return !logOf(data, habit.id, dateISO)?.done;
  if (habit.schedule.type === "weekly") return metWeeklyTarget(data, habit, dateISO);
  if (!isDueOn(habit, dateISO)) return true; // rest day
  return !!logOf(data, habit.id, dateISO)?.done;
}

export function habitCurrentStreak(data: AppData, habit: Habit): number {
  const created = habit.createdAt;
  let streak = 0;
  let cur = todayISO();
  for (let i = 0; i < 1000; i++) {
    if (parseISO(cur) < parseISO(created)) break;
    if (onTrack(data, habit, cur)) {
      // only count days that actually "matter" (due days / weekly / reduce) toward the number,
      // but never break on a legitimate rest day
      if (
        !isRestDay(data.settings, cur) &&
        (habit.kind === "reduce" || habit.schedule.type === "weekly" || isDueOn(habit, cur))
      ) {
        streak++;
      }
      cur = addDays(cur, -1);
    } else {
      break;
    }
  }
  return streak;
}

export function habitLongestStreak(data: AppData, habit: Habit): number {
  const start = habit.createdAt;
  const end = todayISO();
  let best = 0;
  let run = 0;
  let cur = start;
  for (let i = 0; i < 1000; i++) {
    const counts =
      !isRestDay(data.settings, cur) &&
      (habit.kind === "reduce" || habit.schedule.type === "weekly" || isDueOn(habit, cur));
    if (onTrack(data, habit, cur)) {
      if (counts) run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    if (cur === end) break;
    cur = addDays(cur, 1);
  }
  return best;
}

/** Completion rate (build) / avoidance rate (reduce) over the last `days` days, 0..100. */
export function habit30dRate(data: AppData, habit: Habit, days = 30): number {
  const window = isoRange(todayISO(), days);
  let n = 0;
  let hit = 0;
  for (const d of window) {
    if (parseISO(d) < parseISO(habit.createdAt)) continue;
    const l = logOf(data, habit.id, d);
    if (habit.kind === "reduce") {
      n++;
      if (!l?.done) hit++;
    } else if (l) {
      n++;
      if (l.done) hit++;
    }
  }
  return n ? Math.round((hit / n) * 100) : 0;
}

/*
  How a habit tends to go with the Life Score: average score on days the habit was done
  (for reduce habits, days the behaviour occurred) vs other days. Association, not causation.
*/
export interface HabitImpact {
  pct: number; // signed % difference in average Life Score (done days vs other days)
  nWith: number;
  nWithout: number;
}

export function habitLifeScoreImpact(data: AppData, history: DayScore[], habit: Habit): HabitImpact | null {
  const withScores: number[] = [];
  const withoutScores: number[] = [];
  for (const h of history) {
    if (h.lifeScore <= 0) continue;
    if (parseISO(h.date) < parseISO(habit.createdAt)) continue;
    const done = !!logOf(data, habit.id, h.date)?.done;
    if (done) withScores.push(h.lifeScore);
    else withoutScores.push(h.lifeScore);
  }
  if (withScores.length < 3 || withoutScores.length < 3) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const mWith = mean(withScores);
  const mWithout = mean(withoutScores);
  if (mWithout <= 0) return null;
  const pct = Math.round(((mWith - mWithout) / mWithout) * 100);
  return { pct, nWith: withScores.length, nWithout: withoutScores.length };
}

/* -------- Momentum: build habits losing steam before the streak breaks -------- */

/** Fraction of "mattering" days on track in the `days`-day window ending on `endISO`. */
function onTrackRate(data: AppData, habit: Habit, endISO: string, days: number): { rate: number; n: number } {
  const window = isoRange(endISO, days);
  let n = 0;
  let hit = 0;
  for (const d of window) {
    if (parseISO(d) < parseISO(habit.createdAt)) continue;
    if (!isDueOn(habit, d)) continue; // daily/weekdays: only due days count
    if (isRestDay(data.settings, d)) continue;
    n++;
    if (logOf(data, habit.id, d)?.done) hit++;
  }
  return { rate: n ? hit / n : 0, n };
}

export interface HabitMomentum {
  id: string;
  name: string;
  recent: number; // 0..100 completion over the last 7 due days
  prior: number; // 0..100 over the 7 due days before that
  drop: number; // percentage points lost
}

/**
 * Build daily/weekday habits that were going well but have clearly cooled off in the last week
 * versus the week before — an early nudge before the streak actually breaks.
 */
export function habitMomentum(data: AppData): HabitMomentum[] {
  const out: HabitMomentum[] = [];
  const today = todayISO();
  for (const h of data.habits) {
    if (h.archived || h.kind !== "build") continue;
    if (h.schedule.type === "weekly") continue; // weekly targets handled by their own window logic
    const recent = onTrackRate(data, h, today, 7);
    const prior = onTrackRate(data, h, addDays(today, -7), 7);
    if (recent.n < 3 || prior.n < 3) continue;
    const drop = Math.round((prior.rate - recent.rate) * 100);
    // Was doing well (>=60%), has slipped by at least 30 points, and isn't already at zero forever.
    if (prior.rate >= 0.6 && drop >= 30) {
      out.push({ id: h.id, name: h.name, recent: Math.round(recent.rate * 100), prior: Math.round(prior.rate * 100), drop });
    }
  }
  return out.sort((a, b) => b.drop - a.drop);
}

export type HeatLevel = "done" | "missed" | "none";

export interface HeatCell {
  date: string;
  level: HeatLevel;
}

/** Status per day over the last `days` days (oldest first). */
export function habitHeatmap(data: AppData, habit: Habit, days = 119): HeatCell[] {
  const window = isoRange(todayISO(), days);
  return window.map((date) => {
    if (parseISO(date) < parseISO(habit.createdAt)) return { date, level: "none" };
    const log = logOf(data, habit.id, date);
    if (habit.kind === "reduce") {
      return { date, level: log ? (log.done ? "missed" : "done") : "done" };
    }
    if (log?.done) return { date, level: "done" };
    if (habit.schedule.type !== "weekly" && isDueOn(habit, date)) return { date, level: "missed" };
    return { date, level: "none" };
  });
}
