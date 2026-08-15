import { DayScore } from "./types";
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

  const withData = stats.filter((s) => s.n >= 2);
  const best = withData.length ? withData.reduce((m, s) => (s.avg > m.avg ? s : m)) : null;
  const worst = withData.length ? withData.reduce((m, s) => (s.avg < m.avg ? s : m)) : null;

  return { stats, best, worst, enough: withData.length >= 4 };
}
