import {
  AppData,
  AreaKey,
  DailyReview,
  DayScore,
  Habit,
  HabitLog,
  Priority,
  Settings,
  SleepLog,
} from "./types";
import { addDays, isoRange, parseISO, sleepDurationMinutes, weekdayOf } from "./date";
import { inVacation, isRestDay } from "./streak";
import { healthScore } from "./health";

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
  from the pool + sleep + optional check-in, not from averaging the areas. Rest days and
  holidays are scored gently — see missWeightFor. Long-term movement is captured by ELO, not
  by the daily number.
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

/**
 * How much a missed habit still counts on a day you took off.
 *
 * A planned rest day is a decision, not a failure — the habits you deliberately skipped
 * shouldn't read as misses. But it is still a day of your life, so a miss isn't free either:
 * it weighs about a third. Away on holiday it weighs nothing at all, because the point of
 * being away is that the plan doesn't apply.
 *
 * Before this, only holidays were treated leniently and a rest day counted like any other —
 * which is exactly backwards for the days you most need the app to be forgiving.
 */
const REST_DAY_MISS = 0.3;
const VACATION_MISS = 0;

/** 1 on an ordinary day, less on a rest day, 0 on holiday. */
export function missWeightFor(settings: Settings, dateISO: string): number {
  if (inVacation(settings, dateISO)) return VACATION_MISS;
  if (isRestDay(settings, dateISO)) return REST_DAY_MISS;
  return 1;
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
  missWeight: number,
): { earned: number; possible: number } {
  let earned = 0;
  let possible = 0;
  const active = habits.filter(
    (h) => !h.archived && areaKeys.has(h.area) && parseISO(h.createdAt) <= parseISO(dateISO),
  );
  // What you did always counts in full; only the part you missed is scaled by the day's
  // leniency. At missWeight 1 this is the ordinary rule, at 0 a miss drops out entirely.
  const stake = (pts: number, f: number) => pts * (f + (1 - f) * missWeight);
  for (const h of active) {
    if (h.kind === "build") {
      const pts = PRIORITY_POINTS[h.priority];
      if (h.schedule.type === "weekly") {
        const f = Math.min(1, weeklyFraction(h, dateISO, logs));
        earned += pts * f;
        possible += stake(pts, f);
      } else if (isDueOn(h, dateISO)) {
        const f = Math.min(1, fulfillment(h, logFor(logs, h.id, dateISO)));
        earned += pts * f;
        possible += stake(pts, f);
      }
    } else if (isDueOn(h, dateISO)) {
      const pts = reducePoints(h.severity);
      const slipped = !!logFor(logs, h.id, dateISO)?.done;
      earned += slipped ? 0 : pts;
      possible += stake(pts, slipped ? 0 : 1);
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
  missWeight = 1,
): number | null {
  const active = habits.filter(
    (h) => h.area === area && !h.archived && parseISO(h.createdAt) <= parseISO(dateISO),
  );
  if (active.length === 0) return null;

  let wSum = 0;
  let fSum = 0;
  let counted = 0;
  const stake = (w: number, f: number) => w * (f + (1 - f) * missWeight);
  for (const h of active) {
    if (h.kind === "build") {
      // Importance (1..5) sets how much this habit moves the area score; falls back to the
      // habit's priority for records created before explicit weighting existed.
      const w = h.weight ?? PRIORITY_WEIGHT[h.priority];
      // Same leniency as the pool: what you did counts in full, what you missed counts less
      // on a rest day and not at all on holiday. `Math.min(1, f)` keeps an over-fulfilment
      // bonus out of the denominator, where it would otherwise shrink the stake.
      if (h.schedule.type === "weekly") {
        const f = weeklyFraction(h, dateISO, logs);
        fSum += w * f;
        wSum += w * stake(1, Math.min(1, f));
        counted++;
      } else if (isDueOn(h, dateISO)) {
        const f = fulfillment(h, logFor(logs, h.id, dateISO));
        fSum += w * f;
        wSum += w * stake(1, Math.min(1, f));
        counted++;
      }
    } else if (isDueOn(h, dateISO)) {
      // reduce habit: avoided (no occurrence) is full credit; weighted by severity
      const w = h.severity ?? 2;
      const avoided = logFor(logs, h.id, dateISO)?.done ? 0 : 1;
      fSum += w * avoided;
      wSum += w * stake(1, avoided);
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

/**
 * How good a night was, 0..100.
 *
 * Time asleep carries the score. The minutes spent falling asleep are already subtracted by
 * `sleepDurationMinutes`, so they are not penalised a second time here — a long latency shows
 * up as exactly what it is, less sleep. Waking up in the night is a real but small cost: a
 * couple of wake-ups is normal and shouldn't sink an otherwise good night.
 */
export function sleepScore(log: SleepLog, targetMinutes: number): number {
  const dur = sleepDurationMinutes(log.bedTime, log.wakeTime, log.fallAsleepMinutes ?? 0);
  const durScore = sleepDurationScore(dur, targetMinutes);
  const qualityScore = clamp(log.quality * 10);
  const energyScore = clamp((log.morningEnergy ?? log.quality) * 10);
  // Duration leads; how it felt adjusts it rather than deciding it.
  let s = 0.6 * durScore + 0.24 * qualityScore + 0.16 * energyScore;
  // Each night-waking costs a little; capped low on purpose.
  const wakes = log.awakenings ?? 0;
  if (wakes > 0) s -= Math.min(5, wakes * 1.5);
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
  const { habits, habitLogs, reviews, sleep, health, settings } = data;
  const enabled = settings.areas.filter((a) => a.enabled);
  // Rest days and holidays are scored gently — see missWeightFor.
  const missWeight = missWeightFor(settings, dateISO);
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
      // Shown as its own tile, still deliberately kept out of the Life Score blend below —
      // a bad back shouldn't cost you points, but it shouldn't read as a zero either.
      const log = health.find((h) => h.date === dateISO);
      score = log ? healthScore(log) : null;
    } else {
      habitAreaKeys.add(area.key);
      score = habitAreaScore(area.key, dateISO, habits, habitLogs, missWeight);
    }

    if (score !== null) {
      categories[area.key] = Math.round(score);
      hasData = true;
    }
  }

  const slips = reduceSlips(dateISO, habits, habitLogs);
  const pool = habitPool(dateISO, habits, habitLogs, habitAreaKeys, missWeight);

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

/* ---------------- Where a day's score came from ---------------- */

export interface ScoreLine {
  id: string;
  /** A habit's own name, or an English i18n key for the fixed rows. */
  label: string;
  /** True when `label` is a key to run through t(). */
  translate: boolean;
  kind: "habit" | "reduce" | "sleep" | "checkin" | "bonus";
  /** Life-Score points this row actually contributed. */
  plus: number;
  /** Points it was holding and didn't deliver — what the miss cost you. */
  minus: number;
  /** Short state for the row ("Done", "Missed", "7h 15m"). An i18n key when `translate`. */
  detail?: string;
  detailTranslate?: boolean;
}

export interface DayExplanation {
  date: string;
  lifeScore: number | null;
  lines: ScoreLine[];
  plus: number;
  minus: number;
  /** How much a miss weighed that day: 1 ordinary, 0.3 rest day, 0 holiday. */
  missWeight: number;
}

/**
 * The same arithmetic as `computeDay`, kept as a ledger instead of a single number.
 *
 * Every row says what it added and what it was holding and didn't deliver, and the pluses add
 * up to the day's Life Score — so the breakdown can never quietly disagree with the score on
 * the dashboard. It is derived from computeDay's own weights rather than re-invented, which is
 * the only way the two stay in step when the weights change.
 */
export function explainDay(data: AppData, dateISO: string): DayExplanation {
  const { habits, habitLogs, reviews, sleep, settings } = data;
  const enabled = settings.areas.filter((a) => a.enabled);
  const missWeight = missWeightFor(settings, dateISO);
  const lines: ScoreLine[] = [];

  const habitAreaKeys = new Set<AreaKey>();
  for (const area of enabled) {
    if (area.key !== "sleep" && area.key !== "reflection" && area.key !== "finances" && area.key !== "health") {
      habitAreaKeys.add(area.key);
    }
  }

  const pool = habitPool(dateISO, habits, habitLogs, habitAreaKeys, missWeight);
  const sleepLog = enabled.some((a) => a.key === "sleep") ? sleep.find((s) => s.date === dateISO) : undefined;
  const sleepVal = sleepLog ? sleepScore(sleepLog, settings.sleepTargetMinutes) : null;
  const review = enabled.some((a) => a.key === "reflection") ? reviews.find((r) => r.date === dateISO) : undefined;
  const reviewVal = review ? reviewScore(review) : null;

  // The same renormalised blend computeDay uses, so a share here is a share there.
  const parts: number[] = [];
  if (pool.possible > 0) parts.push(HABIT_WEIGHT);
  if (sleepVal !== null) parts.push(SLEEP_WEIGHT);
  if (settings.checkinCounts && reviewVal !== null) parts.push(CHECKIN_WEIGHT);
  const wSum = parts.reduce((a, b) => a + b, 0);

  if (wSum > 0 && pool.possible > 0) {
    const share = (HABIT_WEIGHT / wSum) * 100; // points the whole habit pool is worth today
    const active = habits.filter(
      (h) => !h.archived && habitAreaKeys.has(h.area) && parseISO(h.createdAt) <= parseISO(dateISO),
    );
    for (const h of active) {
      const isBuild = h.kind === "build";
      const due = isBuild ? h.schedule.type === "weekly" || isDueOn(h, dateISO) : isDueOn(h, dateISO);
      if (!due) continue;
      const pts = isBuild ? PRIORITY_POINTS[h.priority] : reducePoints(h.severity);
      const f = isBuild
        ? Math.min(1, h.schedule.type === "weekly" ? weeklyFraction(h, dateISO, habitLogs) : fulfillment(h, logFor(habitLogs, h.id, dateISO)))
        : logFor(habitLogs, h.id, dateISO)?.done
          ? 0
          : 1;
      const got = (pts * f * share) / pool.possible;
      const lost = (pts * (1 - f) * missWeight * share) / pool.possible;
      if (got === 0 && lost === 0) continue;
      lines.push({
        id: h.id,
        label: h.name,
        translate: false,
        kind: isBuild ? "habit" : "reduce",
        plus: got,
        minus: lost,
        detail: isBuild ? (f >= 1 ? "Done" : f > 0 ? "Partly done" : "Missed") : f > 0 ? "Avoided" : "Slipped",
        detailTranslate: true,
      });
    }
  }

  if (sleepVal !== null && wSum > 0) {
    const share = (SLEEP_WEIGHT / wSum) * 100;
    lines.push({
      id: "sleep",
      label: "Sleep",
      translate: true,
      kind: "sleep",
      plus: (sleepVal / 100) * share,
      minus: ((100 - sleepVal) / 100) * share,
      detail: `${sleepVal}/100`,
    });
  }

  if (settings.checkinCounts && reviewVal !== null && wSum > 0) {
    const share = (CHECKIN_WEIGHT / wSum) * 100;
    lines.push({
      id: "checkin",
      label: "Daily check-in",
      translate: true,
      kind: "checkin",
      plus: (reviewVal / 100) * share,
      minus: ((100 - reviewVal) / 100) * share,
      detail: `${reviewVal}/100`,
    });
  }

  // Bonuses sit on top of the blend, so they add points without any being at stake elsewhere.
  const focus = data.focus?.find((f) => f.date === dateISO);
  if (wSum > 0 && focus && focus.items.length > 0) {
    const frac = focus.items.filter((i) => i.done).length / focus.items.length;
    lines.push({
      id: "focus3",
      label: "Today's focus",
      translate: true,
      kind: "bonus",
      plus: frac * FOCUS_BONUS,
      minus: (1 - frac) * FOCUS_BONUS,
      detail: `${focus.items.filter((i) => i.done).length}/${focus.items.length}`,
    });
  }
  const focusMin = (data.focusSessions ?? []).filter((f) => f.date === dateISO).reduce((s, f) => s + f.minutes, 0);
  if (wSum > 0 && focusMin > 0) {
    const frac = Math.min(1, focusMin / (settings.focusTargetMinutes || DEFAULT_FOCUS_TARGET));
    lines.push({
      id: "deepwork",
      label: "Deep work",
      translate: true,
      kind: "bonus",
      plus: frac * DEEPWORK_BONUS,
      minus: (1 - frac) * DEEPWORK_BONUS,
      detail: `${focusMin} min`,
    });
  }

  lines.sort((a, b) => b.plus + b.minus - (a.plus + a.minus));
  return {
    date: dateISO,
    lifeScore: computeDay(data, dateISO).lifeScore,
    lines,
    plus: lines.reduce((s, l) => s + l.plus, 0),
    minus: lines.reduce((s, l) => s + l.minus, 0),
    missWeight,
  };
}
