import { AppData, DayScore } from "./types";
import { habitsForToday } from "./habitView";
import { isoRange, sleepDurationMinutes } from "./date";

/*
  Weekly challenges — a rotating-feeling set of goals evaluated against the last 7 days.
  All derived from logged data; completing them is its own reward (plus the XP the underlying
  activity already grants). Titles/units are English keys, translated at render time.
*/

export interface Challenge {
  id: string;
  title: string; // English key with {n}/{h} placeholders resolved in the label
  icon: string;
  current: number;
  target: number;
  done: boolean;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function weeklyChallenges(data: AppData, byDate: Map<string, DayScore>, today: string): Challenge[] {
  const week = isoRange(today, 7);
  const weekSet = new Set(week);

  // Workouts this week
  const workouts = data.workouts.filter((w) => weekSet.has(w.date)).length;

  // Days logged (any life score)
  const daysLogged = week.filter((d) => (byDate.get(d)?.lifeScore ?? 0) > 0).length;

  // Average sleep (hours) this week
  const sleeps = data.sleep.filter((s) => weekSet.has(s.date));
  const avgSleepH =
    Math.round((mean(sleeps.map((s) => sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0))) / 60) * 10) / 10;

  // Build-habit completion rate this week
  let due = 0;
  let done = 0;
  for (const d of week) {
    for (const g of habitsForToday(data, d)) {
      if (g.habit.kind !== "build") continue;
      due += 1;
      if (g.log?.done) done += 1;
    }
  }
  const habitRate = due > 0 ? Math.round((done / due) * 100) : 0;

  // Journal entries this week
  const journal = data.journal.filter((j) => weekSet.has(j.date)).length;

  // Daily check-ins this week
  const checkins = data.reviews.filter((r) => weekSet.has(r.date)).length;

  const list: Challenge[] = [
    { id: "train", title: "Train {n}× this week", icon: "🏋️", current: workouts, target: 3, done: workouts >= 3 },
    { id: "logall", title: "Log all 7 days", icon: "📅", current: daysLogged, target: 7, done: daysLogged >= 7 },
    { id: "sleep", title: "Average {h}h sleep", icon: "😴", current: avgSleepH, target: 7.5, done: avgSleepH >= 7.5 },
    { id: "habits", title: "Hit {n}% of your habits", icon: "✅", current: habitRate, target: 80, done: habitRate >= 80 },
    { id: "journal", title: "Write 3 journal entries", icon: "📔", current: journal, target: 3, done: journal >= 3 },
    { id: "checkin", title: "Check in on 5 days", icon: "📝", current: checkins, target: 5, done: checkins >= 5 },
  ];

  // Only surface challenges for areas the user actually engages with, but always keep a few.
  return list;
}
