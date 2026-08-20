import { DayScore } from "./types";

/*
  Forward-looking helpers on top of the retrospective analysis engine:
    - earlyWarning: spots a slide forming RIGHT NOW (consecutive decline, or the last couple
      of days sitting well below your recent baseline) so you can course-correct early.
    - predictTomorrow: a rough estimate of tomorrow's Life Score from your recent trend.
  Both are deliberately conservative and clearly framed as estimates, never certainties.
*/

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export interface EarlyWarning {
  kind: "slide" | "dip";
  /** How many days the slide runs (slide), or how far below baseline (dip, points). */
  magnitude: number;
  recent: number; // avg of the recent window
  baseline: number; // recent baseline it's compared against
}

/**
 * Detect a forming downward trend from the most recent scored days.
 * "slide" = 3+ consecutive days each lower than the last.
 * "dip"   = the last 2 days average clearly below the trailing baseline.
 */
export function earlyWarning(history: DayScore[]): EarlyWarning | null {
  const scored = history.filter((h) => h.lifeScore > 0);
  if (scored.length < 6) return null;
  const s = scored.map((h) => h.lifeScore);

  // Consecutive decline ending today.
  let run = 1;
  for (let i = s.length - 1; i > 0; i--) {
    if (s[i] < s[i - 1]) run++;
    else break;
  }
  const baselineAll = mean(s.slice(-14, -2));
  if (run >= 3) {
    return { kind: "slide", magnitude: run, recent: Math.round(mean(s.slice(-run))), baseline: Math.round(baselineAll || mean(s)) };
  }

  // Sharp dip: last 2 days well under the trailing baseline.
  const last2 = mean(s.slice(-2));
  const base = mean(s.slice(-14, -2));
  if (base > 0 && s.length >= 8) {
    const drop = base - last2;
    if (drop >= 10) return { kind: "dip", magnitude: Math.round(drop), recent: Math.round(last2), baseline: Math.round(base) };
  }
  return null;
}

export interface Prediction {
  value: number; // predicted Life Score for tomorrow (0..100)
  trend: number; // slope direction used, in points/day (rounded)
}

/**
 * Rough next-day Life Score estimate: recent average nudged by the recent slope,
 * blended so a single spike doesn't throw it. Needs at least a handful of scored days.
 */
export function predictTomorrow(history: DayScore[]): Prediction | null {
  const scored = history.filter((h) => h.lifeScore > 0);
  if (scored.length < 5) return null;
  const s = scored.map((h) => h.lifeScore).slice(-7);
  const n = s.length;
  // Least-squares slope over the window.
  const xs = s.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(s);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (s[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den ? num / den : 0;
  const avg = my;
  // Day-to-day Life Score is noisy and mean-reverting, so lean mostly on the recent average
  // and only nudge by the trend — extrapolating the last point + full slope overshot reality.
  const fromTrend = s[n - 1] + slope;
  let value = 0.35 * fromTrend + 0.65 * avg;
  // Keep the estimate within a sane band of the recent average so a spike can't run away.
  value = Math.max(avg - 12, Math.min(avg + 12, value));
  value = Math.round(Math.max(0, Math.min(100, value)));
  return { value, trend: Math.round(slope) };
}
