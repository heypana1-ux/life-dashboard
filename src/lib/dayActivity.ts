import { AppData } from "./types";

/*
  Whether a day has ANY logged content — even things that don't move the Life Score
  (journal, sleep, workouts, health…). Used so a day you journaled (or backdated an entry to)
  reads as "logged" in the calendar and activity heatmap, instead of looking empty because its
  score happens to be 0.
*/
export function dayHasEntry(data: AppData, date: string): boolean {
  if (data.journal.some((j) => j.date === date)) return true;
  if (data.reviews.some((r) => r.date === date)) return true;
  if (data.sleep.some((s) => s.date === date)) return true;
  if (data.workouts.some((w) => w.date === date)) return true;
  if (data.health.some((h) => h.date === date)) return true;
  if (data.weight.some((w) => w.date === date)) return true;
  if (data.habitLogs.some((l) => l.date === date && (l.done || (l.count ?? 0) > 0))) return true;
  if (data.focus.some((f) => f.date === date && f.items.some((i) => i.text.trim()))) return true;
  return false;
}
