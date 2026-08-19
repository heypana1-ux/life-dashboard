import { HabitLog } from "./types";

export interface HabitTime {
  /** Hour of day (0-23) the habit is most often completed. */
  hour: number;
  /** How many timestamped completions the estimate is based on. */
  n: number;
  /** Fraction of completions inside the ±1h window around `hour` (confidence). */
  spread: number;
}

/**
 * The time of day a habit is usually completed, learned from the `doneAt` timestamps captured
 * when it's ticked. Uses the densest 3-hour window so a couple of outliers don't skew it.
 * Returns null until there are enough timestamped completions.
 */
export function bestHabitHour(logs: HabitLog[], habitId: string, minSamples = 4): HabitTime | null {
  const counts = new Array(24).fill(0);
  let total = 0;
  for (const l of logs) {
    if (l.habitId !== habitId || !l.done || !l.doneAt) continue;
    const d = new Date(l.doneAt);
    if (Number.isNaN(d.getTime())) continue;
    counts[d.getHours()]++;
    total++;
  }
  if (total < minSamples) return null;

  let bestHour = 0;
  let bestWindow = -1;
  for (let h = 0; h < 24; h++) {
    const w = counts[(h + 23) % 24] + counts[h] + counts[(h + 1) % 24];
    if (w > bestWindow) {
      bestWindow = w;
      bestHour = h;
    }
  }
  return { hour: bestHour, n: total, spread: bestWindow / total };
}

/**
 * The hour of day the user most often logs habits overall (across all habits), for suggesting
 * a check-in reminder time. Null until there are enough timestamped completions.
 */
export function typicalLogHour(logs: HabitLog[], minSamples = 8): number | null {
  const counts = new Array(24).fill(0);
  let total = 0;
  for (const l of logs) {
    if (!l.done || !l.doneAt) continue;
    const d = new Date(l.doneAt);
    if (Number.isNaN(d.getTime())) continue;
    counts[d.getHours()]++;
    total++;
  }
  if (total < minSamples) return null;
  let bestHour = 0;
  let best = -1;
  for (let h = 0; h < 24; h++) {
    const w = counts[(h + 23) % 24] + counts[h] + counts[(h + 1) % 24];
    if (w > best) {
      best = w;
      bestHour = h;
    }
  }
  return bestHour;
}
