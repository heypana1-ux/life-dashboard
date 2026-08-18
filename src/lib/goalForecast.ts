import { Goal } from "./types";
import { addDays, parseISO, todayISO } from "./date";

/*
  A rough pace/ETA forecast for a goal: extrapolate the progress made since the goal was
  created to estimate when it reaches 100%, and compare that to the deadline. Linear and
  descriptive — it assumes you keep up your average pace, nothing more.
*/

export type GoalStatus = "done" | "unknown" | "stalled" | "onTrack" | "behind";

export interface GoalForecast {
  status: GoalStatus;
  pace: number; // progress points per day
  daysLeft: number | null; // days to reach 100% at current pace
  etaDate: string | null; // projected completion date (YYYY-MM-DD)
  daysToDeadline: number | null;
}

export function goalForecast(goal: Goal, today = todayISO()): GoalForecast {
  const daysToDeadline = goal.deadline
    ? Math.round((parseISO(goal.deadline).getTime() - parseISO(today).getTime()) / 86400000)
    : null;
  if (goal.progress >= 100) return { status: "done", pace: 0, daysLeft: 0, etaDate: null, daysToDeadline };

  const created = goal.createdAt ? goal.createdAt.slice(0, 10) : today;
  const daysSince = Math.max(
    1,
    Math.round((parseISO(today).getTime() - parseISO(created).getTime()) / 86400000),
  );
  const pace = goal.progress / daysSince; // points/day since creation

  // Not enough signal yet: brand-new goal or no progress.
  if (pace <= 0.05) {
    return { status: daysSince < 4 ? "unknown" : "stalled", pace: 0, daysLeft: null, etaDate: null, daysToDeadline };
  }

  const daysLeft = Math.ceil((100 - goal.progress) / pace);
  const etaDate = addDays(today, Math.min(daysLeft, 3650));
  const status: GoalStatus = daysToDeadline != null ? (daysLeft <= daysToDeadline ? "onTrack" : "behind") : "onTrack";
  return { status, pace, daysLeft, etaDate, daysToDeadline };
}

/* ---------------- Body-metric target forecast ---------------- */

export interface MeasureForecast {
  current: number;
  toGo: number; // signed: target − current
  weeklyRate: number; // signed change per week from the trend
  etaDate: string | null; // projected date to reach the target
  reached: boolean;
}

/** Forecast reaching a body-metric target from the trend of its measurements. */
export function measurementForecast(
  points: { date: string; value: number }[],
  target: number,
  today = todayISO(),
): MeasureForecast | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1));
  const current = sorted[sorted.length - 1].value;
  const toGo = Math.round((target - current) * 10) / 10;
  if (Math.abs(toGo) < 0.05) return { current, toGo: 0, weeklyRate: 0, etaDate: null, reached: true };

  // Linear regression: value over days since the first point.
  const t0 = parseISO(sorted[0].date).getTime();
  const xs = sorted.map((p) => (parseISO(p.date).getTime() - t0) / 86400000);
  const ys = sorted.map((p) => p.value);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den ? num / den : 0; // per day
  let etaDate: string | null = null;
  if (slope !== 0 && Math.sign(target - current) === Math.sign(slope)) {
    const days = (target - current) / slope;
    if (days > 0 && days < 3650) etaDate = addDays(today, Math.ceil(days));
  }
  return { current, toGo, weeklyRate: Math.round(slope * 7 * 100) / 100, etaDate, reached: false };
}
