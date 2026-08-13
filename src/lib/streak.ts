import { DayScore, Settings } from "./types";
import { addDays, todayISO } from "./date";

/*
  Streak helpers with rest-day and grace support.
   - Rest days (vacation / planned rest) are neutral: they never break a streak and don't count.
   - Grace: a streak tolerates up to `streakGrace` consecutive missed days before it breaks,
     so forgetting to log for a day or two doesn't wipe a long run.
*/

export function isRestDay(settings: Settings, date: string): boolean {
  return settings.restDays?.includes(date) ?? false;
}

/** Consecutive logged days ending today, honoring rest days and grace. */
export function activityStreak(history: DayScore[], settings: Settings): number {
  if (history.length === 0) return 0;
  const rest = new Set(settings.restDays ?? []);
  const grace = settings.streakGrace ?? 0;
  const byDate = new Map(history.map((h) => [h.date, h]));
  const earliest = history[0].date;

  let streak = 0;
  let gap = 0;
  let cur = todayISO();
  for (let i = 0; i < 4000; i++) {
    if (cur < earliest) break;
    if (rest.has(cur)) {
      cur = addDays(cur, -1);
      continue; // neutral
    }
    const h = byDate.get(cur);
    if (h && h.lifeScore > 0) {
      streak++;
      gap = 0;
    } else {
      // Today not yet logged shouldn't count as a broken day.
      if (cur !== todayISO()) {
        gap++;
        if (gap > grace) break;
      }
    }
    cur = addDays(cur, -1);
  }
  return streak;
}
