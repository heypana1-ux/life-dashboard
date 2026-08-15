import { DayScore } from "./types";

/*
  "Best self" benchmark: compare the user's current 30-day average Life Score with the best
  30-day stretch they've ever had. Competing against your own peak, not other people.
*/

export interface BestSelf {
  current: number;
  best: number;
  bestEndDate: string | null;
  diff: number; // current − best
  enough: boolean;
}

const WINDOW = 30;
const MIN_SCORED = 10;

export function bestSelf(history: DayScore[]): BestSelf {
  const sorted = [...history].sort((a, b) => (a.date < b.date ? -1 : 1));

  const windowAvg = (endIdx: number): { avg: number; n: number } => {
    let sum = 0;
    let n = 0;
    for (let i = Math.max(0, endIdx - WINDOW + 1); i <= endIdx; i++) {
      if (sorted[i].lifeScore > 0) {
        sum += sorted[i].lifeScore;
        n += 1;
      }
    }
    return { avg: n ? sum / n : 0, n };
  };

  let best = 0;
  let bestEndDate: string | null = null;
  for (let i = 0; i < sorted.length; i++) {
    const w = windowAvg(i);
    if (w.n >= MIN_SCORED && w.avg > best) {
      best = w.avg;
      bestEndDate = sorted[i].date;
    }
  }

  const cur = sorted.length ? windowAvg(sorted.length - 1) : { avg: 0, n: 0 };
  const current = Math.round(cur.avg);
  const bestRounded = Math.round(best);
  return {
    current,
    best: bestRounded,
    bestEndDate,
    diff: current - bestRounded,
    enough: cur.n >= MIN_SCORED && bestRounded > 0,
  };
}
