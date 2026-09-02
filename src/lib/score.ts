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
import { inVacation } from "./streak";

/*
  Scoring model (transparent by design):

  Life Score = a weighted blend of the parts that have data today, renormalized over whatever
  is present, then nudged by optional focus bonuses:

    * HABITS (weight 0.65) — ONE shared points pool across every in-scope habit, regardless of
      area, so same-area habits never dilute each other and priority means the same everywhere.
      Each habit contributes `possible` points and you keep `earned`:
        - build habits: possible = priority points (low 1 / medium 3 / high 6),
          earned = possible × completion (0..1). Weekly-target habits use a rolling 7-day window.
        - reduce habits: possible = severity points, earned = possible if avoided, else 0.
      The day's habit score is earned / possible × 100. A "high" habit moves the day the same
      amount whether it's your only habit or one of ten.
    * SLEEP (weight 0.25) — from the manual sleep log (duration + quality + morning energy).
    * CHECK-IN (weight 0.10) — the daily 1..10 ratings, and ONLY if the user opts in
      (settings.checkinCounts); otherwise the check-in stays informational and doesn't score.

  Per-area category scores (0..100) are still computed for display, but the Life Score comes
  from the pool + sleep + optional check-in, not from averaging the areas. On vacation days
  scoring is lenient (missed habits and slips simply don't count). Long-term movement is
  captured by ELO, not by the daily number.
*/

/** Per-area display weighting (importance 1..5, falling back to priority). */
const PRIORITY_WEIGHT: Record<Priority, number> = { low: 1, medium: 2, high: 3 };

/** Points a habit is worth in the shared Life-Score pool, by priority. Deliberately spread
 *  (1 / 3 / 6) so a "high" habit clearly outweighs a "low" one. */
export const PRIORITY_POINTS: Record<Priority, number> = { low: 1, medium: 3, high: 6 };

/** Points at stake for a reduce habit, scaled by how bad a slip is (severity 1..5). */
function reducePoints(severity?: number): number {
  const s = severity ?? 2;
  return s >= 4 ? 6 : s === 3 ? 3 : 1;
}

/** Blend weights for the Life Score parts (renormalized over whichever are present). */
const HABIT_WEIGHT = 0.65;
const SLEEP_WEIGHT = 0.25;
const CHECKIN_WEIGHT = 0.1;

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

/** Max Life-Score bonus for hitting your daily deep-work / focus target. */
const DEEPWORK_BONUS = 3;
/** Fallback daily focus target (minutes) when the user hasn't set one. */
const DEFAULT_FOCUS_TARGET = 120;

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

/** One shared points pool across every in-scope habit for the day, regardless of area.
 *  `possible` is the total points at stake (priority for build, severity for reduce) and
 *  `earned` is what the user actually got. Dividing the two gives a habit adherence 0..1 that
 *  weights each habit the same no matter how many others share its area. */
function habitPool(
  dateISO: string,
  habits: Habit[],
  logs: HabitLog[],
  areaKeys: Set<AreaKey>,
  lenient: boolean,
): { earned: number; possible: number } {
  let earned = 0;
  let possible = 0;
  const active = habits.filter(
    (h) => !h.archived && areaKeys.has(h.area) && parseISO(h.createdAt) <= parseISO(dateISO),
  );
  for (const h of active) {
    if (h.kind === "build") {
      const pts = PRIORITY_POINTS[h.priority];
      if (h.schedule.type === "weekly") {
        const f = Math.min(1, weeklyFraction(h, dateISO, logs));
        if (lenient && f === 0) continue; // vacation: a missed habit simply doesn't count
        earned += pts * f;
        possible += pts;
      } else if (isDueOn(h, dateISO)) {
        const f = Math.min(1, fulfillment(h, logFor(logs, h.id, dateISO)));
        if (lenient && f === 0) continue;
        earned += pts * f;
        possible += pts;
      }
    } else if (isDueOn(h, dateISO)) {
      const pts = reducePoints(h.severity);
      const slipped = !!logFor(logs, h.id, dateISO)?.done;
      if (lenient && slipped) continue; // vacation: a slip simply doesn't count
      earned += slipped ? 0 : pts;
      possible += pts;
    }
  }
  return { earned, possible };
}

/** Score (0..100) for one habit-driven area on a day, or null if the area has no habits in scope. */
function habitAreaScore(
  area: AreaKey,
  dateISO: string,
  habits: Habit[],
  logs: HabitLog[],
  lenient = false,
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
        const f = weeklyFraction(h, dateISO, logs);
        // On lenient (vacation) days a missed habit simply doesn't count against you.
        if (!lenient || f > 0) {
          fSum += w * f;
          wSum += w;
          counted++;
        }
      } else if (isDueOn(h, dateISO)) {
        const f = fulfillment(h, logFor(logs, h.id, dateISO));
        if (!lenient || f > 0) {
          fSum += w * f;
          wSum += w;
          counted++;
        }
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
  const qualityScore = clamp(log.quality * 10);
  const energyScore = clamp((log.morningEnergy ?? log.quality) * 10);
  // Blend duration, self-rated quality, and how you woke up.
  let s = 0.45 * durScore + 0.3 * qualityScore + 0.25 * energyScore;
  // Falling asleep slowly costs a little (nothing under 20 min); capped.
  const latency = log.fallAsleepMinutes ?? 0;
  if (latency > 20) s -= Math.min(12, ((latency - 20) / 10) * 3);
  // Each night-waking costs a little; capped.
  const wakes = log.awakenings ?? 0;
  if (wakes > 0) s -= Math.min(12, wakes * 3);
  return Math.round(clamp(s));
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
  // On vacation days scoring is lenient: missed habits and slips simply don't count.
  const lenient = inVacation(settings, dateISO);
  const categories: Partial<Record<AreaKey, number>> = {};

  const habitAreaKeys = new Set<AreaKey>();
  let sleepScoreVal: number | null = null;
  let reviewScoreVal: number | null = null;
  let hasData = false;

  // Per-area category scores (for display). The Life Score itself is computed from the shared
  // habit pool + sleep + optional check-in below, not by averaging these.
  for (const area of enabled) {
    let score: number | null = null;
    if (area.key === "sleep") {
      const log = sleep.find((s) => s.date === dateISO);
      if (log) {
        score = sleepScore(log, settings.sleepTargetMinutes);
        sleepScoreVal = score;
      }
    } else if (area.key === "reflection") {
      const r = reviews.find((x) => x.date === dateISO);
      if (r) {
        score = reviewScore(r);
        reviewScoreVal = score;
      }
    } else if (area.key === "finances") {
      score = null; // manual net-worth tracking exists, but no daily-scoring engine yet
    } else if (area.key === "health") {
      score = null; // tracked & correlated, but deliberately never part of the Life Score
    } else {
      habitAreaKeys.add(area.key);
      score = habitAreaScore(area.key, dateISO, habits, habitLogs, lenient);
    }

    if (score !== null) {
      categories[area.key] = Math.round(score);
      hasData = true;
    }
  }

  const slips = reduceSlips(dateISO, habits, habitLogs);
  const pool = habitPool(dateISO, habits, habitLogs, habitAreaKeys, lenient);

  // Blend the parts that have data, renormalized over whatever is present today.
  const parts: { w: number; v: number }[] = [];
  if (pool.possible > 0) {
    parts.push({ w: HABIT_WEIGHT, v: clamp((pool.earned / pool.possible) * 100) });
  }
  if (sleepScoreVal !== null) parts.push({ w: SLEEP_WEIGHT, v: sleepScoreVal });
  // The daily check-in only counts toward the score when the user opts in — and then lightly.
  if (settings.checkinCounts && reviewScoreVal !== null) {
    parts.push({ w: CHECKIN_WEIGHT, v: reviewScoreVal });
  }

  let lifeScore: number | null = null;
  if (parts.length > 0) {
    const wSum = parts.reduce((s, p) => s + p.w, 0);
    lifeScore = Math.round(clamp(parts.reduce((s, p) => s + p.w * p.v, 0) / wSum));
    // Optional morning "top 3" focus: a small, capped bonus for finishing what you set out to do.
    const focus = data.focus?.find((f) => f.date === dateISO);
    if (focus && focus.items.length > 0) {
      const doneFrac = focus.items.filter((i) => i.done).length / focus.items.length;
      lifeScore = Math.round(clamp(lifeScore + doneFrac * FOCUS_BONUS));
    }
    // Deep-work / focus sessions: a small, capped nudge for hitting your daily focus target.
    const focusMin = (data.focusSessions ?? [])
      .filter((f) => f.date === dateISO)
      .reduce((s, f) => s + f.minutes, 0);
    if (focusMin > 0) {
      const target = data.settings.focusTargetMinutes || DEFAULT_FOCUS_TARGET;
      const frac = Math.min(1, focusMin / target);
      lifeScore = Math.round(clamp(lifeScore + frac * DEEPWORK_BONUS));
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
      // On vacation your Life Rating can rise but never fall — relaxing shouldn't cost you rank.
      if (inVacation(data.settings, cur) && delta < 0) delta = 0;
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
