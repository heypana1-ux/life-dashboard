import {
  AppData,
  AreaKey,
  DailyReview,
  DayScore,
  Habit,
  HabitLog,
  Priority,
  SleepLog,
} from "./types";
import { addDays, isoRange, parseISO, sleepDurationMinutes, weekdayOf } from "./date";

/*
  Scoring model (transparent by design):

  - Each enabled AREA gets a 0..100 score for a day, computed from that area's data.
      * Habit-driven areas (productivity, sport, habits, learning, creativity):
        weighted adherence to that area's habits due that day.
          - "build" habits contribute done?1:0, weighted by priority.
          - "reduce" habits contribute avoided?1:0, weighted by severity.
        Weekly-target build habits are scored over a rolling 7-day window, so rest days
        are never punished as "missed training".
      * sleep: from the manual sleep log (duration vs. personal target + quality).
      * reflection: from the daily check-in (average of the 1..10 metrics).
  - The Life Score is the weight-normalized average of the areas that HAVE data that day,
    then scaled by a COVERAGE factor: of the areas you were set up to act on today, how many
    did you actually engage? Touching only a sliver of what's in play dampens the day, so a
    barely-there day (e.g. one habit ticked, nothing else logged) can no longer post a high
    score just because the little it measured went well.
  - Because a reduce-habit slip only lowers its own area's average (bounded by that area's
    weight), a single bad day dents the score without wrecking it; long-term movement is
    captured by ELO, not by the daily number.
*/

const PRIORITY_WEIGHT: Record<Priority, number> = { low: 1, medium: 2, high: 3 };

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Whether a habit is "due" on a given calendar day.
 * Weekly BUILD habits return false here (they are evaluated over a rolling window instead);
 * weekly REDUCE habits are monitored daily.
 */
export function isDueOn(habit: Habit, dateISO: string): boolean {
  if (habit.archived) return false;
  if (parseISO(habit.createdAt) > parseISO(dateISO)) return false;
  switch (habit.schedule.type) {
    case "daily":
      return true;
    case "weekdays":
      return (habit.schedule.days ?? []).includes(weekdayOf(dateISO));
    case "weekly":
      return habit.kind === "reduce"; // reduce habits are watched every day
    default:
      return false;
  }
}

function logFor(logs: HabitLog[], habitId: string, dateISO: string): HabitLog | undefined {
  return logs.find((l) => l.habitId === habitId && l.date === dateISO);
}

/** Max bonus for exceeding a habit's target (e.g. 2h vs a 1h goal → up to +15%). */
const OVERFILL_CAP = 0.15;

/** Max Life-Score bonus for completing the optional morning "top 3" focus. */
const FOCUS_BONUS = 2;

/** Lowest fraction of the raw score a full lack of coverage can leave (1.0 = full coverage,
 *  no penalty). At 0.65 a day where you engaged none of what was in play keeps 65% of its
 *  adherence score; a fully-covered day keeps 100%. */
const COVERAGE_FLOOR = 0.65;

/**
 * Credit for a single completed occurrence: 1.0 normally, slightly more when the logged
 * amount (minutes or value) exceeds the habit's target. The bonus is small and capped, so
 * doing twice the goal is a nudge up — never "double".
 */
export function fulfillment(habit: Habit, log: HabitLog | undefined): number {
  if (!log?.done) return 0;
  // Per-day count target: graduated credit — fewer than target gives partial credit,
  // more than target a small capped bonus (never "double").
  if (habit.timesPerDay && habit.timesPerDay > 0) {
    const count = log.count ?? (log.done ? habit.timesPerDay : 0);
    const frac = count / habit.timesPerDay;
    if (frac <= 1) return Math.max(0, frac);
    return 1 + Math.min(OVERFILL_CAP, (frac - 1) * 0.15);
  }
  let amount: number | undefined;
  let target: number | undefined;
  if (habit.targetMinutes && log.minutes != null) {
    amount = log.minutes;
    target = habit.targetMinutes;
  } else if (habit.targetValue && log.value != null) {
    amount = log.value;
    target = habit.targetValue;
  }
  if (!amount || !target || target <= 0) return 1;
  const over = Math.max(0, amount / target - 1);
  return 1 + Math.min(OVERFILL_CAP, over * 0.15);
}

/** Rolling completion fraction for a weekly-target habit (0..1+bonus). */
function weeklyFraction(habit: Habit, dateISO: string, logs: HabitLog[]): number {
  const target = habit.schedule.timesPerWeek ?? 1;
  const window = isoRange(dateISO, 7);
  let sum = 0;
  for (const d of window) sum += fulfillment(habit, logFor(logs, habit.id, d));
  return Math.min(1 + OVERFILL_CAP, sum / target);
}

/** Whether a habit-driven area had anything expected of the user on a given day
 *  (a habit due today, or any weekly-target habit). Used for the coverage factor. */
function habitAreaExpected(area: AreaKey, dateISO: string, habits: Habit[]): boolean {
  return habits.some(
    (h) =>
      h.area === area &&
      !h.archived &&
      parseISO(h.createdAt) <= parseISO(dateISO) &&
      (h.schedule.type === "weekly" || isDueOn(h, dateISO)),
  );
}

/** Score (0..100) for one habit-driven area on a day, or null if the area has no habits in scope. */
function habitAreaScore(
  area: AreaKey,
  dateISO: string,
  habits: Habit[],
  logs: HabitLog[],
): number | null {
  const active = habits.filter(
    (h) => h.area === area && !h.archived && parseISO(h.createdAt) <= parseISO(dateISO),
  );
  if (active.length === 0) return null;

  let wSum = 0;
  let fSum = 0;
  let counted = 0;
  for (const h of active) {
    if (h.kind === "build") {
      // Importance (1..5) sets how much this habit moves the area score; falls back to the
      // habit's priority for records created before explicit weighting existed.
      const w = h.weight ?? PRIORITY_WEIGHT[h.priority];
      if (h.schedule.type === "weekly") {
        fSum += w * weeklyFraction(h, dateISO, logs);
        wSum += w;
        counted++;
      } else if (isDueOn(h, dateISO)) {
        fSum += w * fulfillment(h, logFor(logs, h.id, dateISO));
        wSum += w;
        counted++;
      }
    } else if (isDueOn(h, dateISO)) {
      // reduce habit: avoided (no occurrence) is full credit; weighted by severity
      const w = h.severity ?? 2;
      fSum += w * (logFor(logs, h.id, dateISO)?.done ? 0 : 1);
      wSum += w;
      counted++;
    }
  }
  if (counted === 0 || wSum === 0) return null;
  return clamp((fSum / wSum) * 100);
}

/** Duration-vs-target sleep sub-score, penalizing shortfall more than surplus. */
function sleepDurationScore(minutes: number, targetMinutes: number): number {
  if (minutes >= targetMinutes) {
    const over = minutes - targetMinutes;
    return clamp(100 - (over / 60) * 6); // mild penalty for large oversleep
  }
  const deficit = targetMinutes - minutes;
  return clamp(100 - (deficit / 60) * 14); // steeper penalty for deficit
}

export function sleepScore(log: SleepLog, targetMinutes: number): number {
  const dur = sleepDurationMinutes(log.bedTime, log.wakeTime, log.fallAsleepMinutes ?? 0);
  const durScore = sleepDurationScore(dur, targetMinutes);
  return clamp(0.6 * durScore + 0.4 * log.quality * 10);
}

export function reviewScore(r: DailyReview): number {
  return clamp(((r.productivity + r.mood + r.energy + r.satisfaction + r.discipline) / 5) * 10);
}

/** Count of reduce-habit occurrences ("slips") logged on a day — for informational display. */
export function reduceSlips(dateISO: string, habits: Habit[], logs: HabitLog[]): number {
  const reduce = habits.filter((h) => h.kind === "reduce" && !h.archived);
  return reduce.filter((h) => logFor(logs, h.id, dateISO)?.done).length;
}

export interface DayComputation {
  lifeScore: number | null;
  categories: Partial<Record<AreaKey, number>>;
  slips: number;
  hasData: boolean;
}

/** Compute a single day's categories and Life Score from the raw data. */
export function computeDay(data: AppData, dateISO: string): DayComputation {
  const { habits, habitLogs, reviews, sleep, settings } = data;
  const enabled = settings.areas.filter((a) => a.enabled);
  const categories: Partial<Record<AreaKey, number>> = {};

  let weightSum = 0;
  let weighted = 0;
  let hasData = false;

  for (const area of enabled) {
    let score: number | null = null;
    if (area.key === "sleep") {
      const log = sleep.find((s) => s.date === dateISO);
      if (log) score = sleepScore(log, settings.sleepTargetMinutes);
    } else if (area.key === "reflection") {
      const r = reviews.find((x) => x.date === dateISO);
      if (r) score = reviewScore(r);
    } else if (area.key === "finances") {
      score = null; // manual net-worth tracking exists, but no daily-scoring engine yet
    } else if (area.key === "health") {
      score = null; // tracked & correlated, but deliberately never part of the Life Score
    } else {
      score = habitAreaScore(area.key, dateISO, habits, habitLogs);
    }

    if (score !== null) {
      categories[area.key] = Math.round(score);
      weighted += area.weight * score;
      weightSum += area.weight;
      hasData = true;
    }
  }

  const slips = reduceSlips(dateISO, habits, habitLogs);

  // Coverage: of the areas you were set up to act on today, how many did you engage?
  // Habit areas count when a habit was due (or is a weekly target); sleep and reflection
  // count every day they're enabled (you can always log sleep and check in). Engaging only a
  // fraction scales the day down toward COVERAGE_FLOOR, so light days can't post full scores.
  let expected = 0;
  let engaged = 0;
  for (const area of enabled) {
    let expectedToday = false;
    if (area.key === "sleep" || area.key === "reflection") expectedToday = true;
    else if (area.key === "finances" || area.key === "health") expectedToday = false;
    else expectedToday = habitAreaExpected(area.key, dateISO, habits);
    if (!expectedToday) continue;
    expected++;
    if (categories[area.key] != null) engaged++;
  }
  const coverage = expected > 0 ? engaged / expected : 1;
  const coverageFactor = COVERAGE_FLOOR + (1 - COVERAGE_FLOOR) * coverage;

  let lifeScore: number | null = null;
  if (weightSum > 0) {
    lifeScore = Math.round(clamp((weighted / weightSum) * coverageFactor));
    // Optional morning "top 3" focus: a small, capped bonus for finishing what you set out to do.
    const focus = data.focus?.find((f) => f.date === dateISO);
    if (focus && focus.items.length > 0) {
      const doneFrac = focus.items.filter((i) => i.done).length / focus.items.length;
      lifeScore = Math.round(clamp(lifeScore + doneFrac * FOCUS_BONUS));
    }
  }

  return { lifeScore, categories, slips, hasData };
}

/* ---------------- ELO ---------------- */

// Tuned for a rating that reacts faster to good and bad phases instead of holding rank:
// bigger daily deltas (K), a wider per-day cap (CLAMP), and a slightly shorter baseline window.
const ELO_K = 1.5;
const ELO_CLAMP = 40;
const ELO_TRAILING = 12;

/**
 * Compute the full day-by-day history (Life Score + ELO) over an inclusive date range.
 * ELO rises/falls relative to the user's own trailing average, so it gets harder to
 * keep climbing as the baseline improves.
 */
export function computeHistory(data: AppData, fromISO: string, toISO: string): DayScore[] {
  const out: DayScore[] = [];
  let elo = data.settings.eloStart;
  const recent: number[] = [];

  let cur = fromISO;
  // walk day by day
  // guard against infinite loop
  for (let i = 0; i < 4000; i++) {
    const day = computeDay(data, cur);
    if (day.lifeScore !== null) {
      const avg =
        recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 60;
      let delta = ELO_K * (day.lifeScore - avg);
      delta = Math.max(-ELO_CLAMP, Math.min(ELO_CLAMP, delta));
      delta = Math.round(delta);
      elo += delta;
      recent.push(day.lifeScore);
      if (recent.length > ELO_TRAILING) recent.shift();
      out.push({
        date: cur,
        lifeScore: day.lifeScore,
        categories: day.categories,
        elo,
        eloDelta: delta,
      });
    } else {
      out.push({
        date: cur,
        lifeScore: 0,
        categories: day.categories,
        elo,
        eloDelta: 0,
      });
    }
    if (cur === toISO) break;
    cur = addDays(cur, 1);
  }
  return out;
}

export const scoreLabel = (s: number): string =>
  s >= 85 ? "Excellent" : s >= 70 ? "Strong" : s >= 55 ? "Solid" : s >= 40 ? "Mixed" : "Rough";

export const scoreColor = (s: number): string =>
  s >= 70 ? "var(--good)" : s >= 45 ? "var(--warn)" : "var(--bad)";
