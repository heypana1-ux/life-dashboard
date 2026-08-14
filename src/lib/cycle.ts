import { HealthLog } from "./types";
import { addDays, daysBetween } from "./date";

/*
  Lightweight menstrual-cycle analysis from the daily health logs. A "period start" is the
  first day of a run of days with flow (period > 0). Cycle length is the gap between
  consecutive starts; the next period is predicted from the recent average. Everything is
  a rough estimate from what was logged — never medical advice.
*/

export interface CyclePeriod {
  start: string;
  length: number; // consecutive logged flow days
}

export interface CycleInfo {
  lastStart: string | null;
  avgLength: number | null; // average cycle length in days
  nextPredicted: string | null;
  daysUntilNext: number | null;
  cycleDay: number | null; // 1-based day within the current cycle
  periods: CyclePeriod[]; // most recent first
}

/** Detect period runs from health logs (flow = period > 0). */
export function detectPeriods(health: HealthLog[]): CyclePeriod[] {
  const flow = health
    .filter((h) => (h.period ?? 0) > 0)
    .map((h) => h.date)
    .sort();
  if (flow.length === 0) return [];

  const periods: CyclePeriod[] = [];
  let start = flow[0];
  let length = 1;
  for (let i = 1; i < flow.length; i++) {
    if (daysBetween(flow[i - 1], flow[i]) === 1) {
      length += 1;
    } else {
      periods.push({ start, length });
      start = flow[i];
      length = 1;
    }
  }
  periods.push({ start, length });
  return periods.reverse(); // most recent first
}

export function analyzeCycle(health: HealthLog[], today: string): CycleInfo {
  const periods = detectPeriods(health);
  if (periods.length === 0) {
    return { lastStart: null, avgLength: null, nextPredicted: null, daysUntilNext: null, cycleDay: null, periods };
  }

  const lastStart = periods[0].start;

  // Cycle lengths = gaps between consecutive starts (recent first). Use up to 6 recent gaps.
  const gaps: number[] = [];
  for (let i = 0; i < periods.length - 1 && gaps.length < 6; i++) {
    const g = daysBetween(periods[i + 1].start, periods[i].start);
    if (g >= 15 && g <= 60) gaps.push(g); // ignore implausible gaps
  }
  const avgLength = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;

  const nextPredicted = avgLength ? addDays(lastStart, avgLength) : null;
  const daysUntilNext = nextPredicted ? daysBetween(today, nextPredicted) : null;
  const cycleDay = daysBetween(lastStart, today) + 1;

  return {
    lastStart,
    avgLength,
    nextPredicted,
    daysUntilNext,
    cycleDay: cycleDay >= 1 ? cycleDay : null,
    periods,
  };
}

export const FLOW_LABEL: Record<number, string> = {
  1: "Light",
  2: "Medium",
  3: "Heavy",
};
