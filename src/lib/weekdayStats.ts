import { DailyReview, DayScore } from "./types";
import { weekdayOf } from "./date";

/*
  Average Life Score per weekday, to surface patterns like "Mondays are your lowest day".
  Derived from scored history only.
*/

export interface WeekdayStat {
  wd: number; // 0=Sun … 6=Sat
  avg: number;
  n: number;
}

export interface WeekdayPatterns {
  stats: WeekdayStat[]; // Monday-first order
  best: WeekdayStat | null;
  worst: WeekdayStat | null;
  enough: boolean;
}

const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

export function weekdayPatterns(history: DayScore[]): WeekdayPatterns {
  const sum = new Map<number, { total: number; n: number }>();
  for (const h of history) {
    if (h.lifeScore <= 0) continue;
    const wd = weekdayOf(h.date);
    const cur = sum.get(wd) ?? { total: 0, n: 0 };
    cur.total += h.lifeScore;
    cur.n += 1;
    sum.set(wd, cur);
  }

  const stats: WeekdayStat[] = MON_FIRST.map((wd) => {
    const c = sum.get(wd);
    return { wd, avg: c && c.n ? Math.round(c.total / c.n) : 0, n: c?.n ?? 0 };
  });

  // Any weekday with at least one scored day counts; the card appears once a few weekdays
  // have data instead of waiting for a large sample.
  const withData = stats.filter((s) => s.n >= 1);
  const best = withData.length ? withData.reduce((m, s) => (s.avg > m.avg ? s : m)) : null;
  const worst = withData.length ? withData.reduce((m, s) => (s.avg < m.avg ? s : m)) : null;

  return { stats, best, worst, enough: withData.length >= 3 };
}

/* ----------------- How you FEEL by weekday (from check-ins) ----------------- */

export const FEELING_METRICS = [
  { key: "mood", label: "Mood" },
  { key: "energy", label: "Energy" },
  { key: "productivity", label: "Productivity" },
  { key: "satisfaction", label: "Satisfaction" },
  { key: "discipline", label: "Discipline" },
] as const;

export type FeelingKey = (typeof FEELING_METRICS)[number]["key"];

export interface FeelingMetric {
  key: FeelingKey;
  label: string; // English key
  avg: number[]; // Monday-first, one per weekday; 0 = no data that weekday
}

export interface WeekdayFeelings {
  metrics: FeelingMetric[];
  n: number[]; // Monday-first count of check-ins per weekday
  total: number;
  enough: boolean;
}

/** Average of each check-in metric per weekday — "how you feel on Mondays vs Fridays". */
export function weekdayFeelings(reviews: DailyReview[]): WeekdayFeelings {
  const n = MON_FIRST.map(() => 0);
  const sums = FEELING_METRICS.map(() => MON_FIRST.map(() => 0));
  for (const r of reviews) {
    const idx = MON_FIRST.indexOf(weekdayOf(r.date));
    if (idx < 0) continue;
    n[idx] += 1;
    FEELING_METRICS.forEach((m, mi) => {
      sums[mi][idx] += r[m.key];
    });
  }
  const metrics: FeelingMetric[] = FEELING_METRICS.map((m, mi) => ({
    key: m.key,
    label: m.label,
    avg: MON_FIRST.map((_, idx) => (n[idx] ? Math.round((sums[mi][idx] / n[idx]) * 10) / 10 : 0)),
  }));
  const daysWith = n.filter((x) => x > 0).length;
  // Show the grid once there are a handful of check-ins across a couple of weekdays; the card
  // itself notes when more data would sharpen the pattern.
  return { metrics, n, total: reviews.length, enough: reviews.length >= 4 && daysWith >= 2 };
}

export interface FeelingHighlight {
  metricLabel: string;
  bestWd: number;
  worstWd: number;
  spread: number;
}

/** The check-in metric that swings most across the week (for a one-line summary). */
export function feelingHighlight(f: WeekdayFeelings): FeelingHighlight | null {
  let pick: FeelingHighlight | null = null;
  for (const m of f.metrics) {
    const pts = m.avg
      .map((v, idx) => ({ v, wd: MON_FIRST[idx], has: f.n[idx] > 0 }))
      .filter((x) => x.has);
    if (pts.length < 4) continue;
    const hi = pts.reduce((a, b) => (b.v > a.v ? b : a));
    const lo = pts.reduce((a, b) => (b.v < a.v ? b : a));
    const spread = Math.round((hi.v - lo.v) * 10) / 10;
    if (!pick || spread > pick.spread) pick = { metricLabel: m.label, bestWd: hi.wd, worstWd: lo.wd, spread };
  }
  return pick && pick.spread >= 1 ? pick : null;
}
