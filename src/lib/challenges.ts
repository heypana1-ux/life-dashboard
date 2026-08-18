import { AppData, DayScore } from "./types";
import { habitsForToday } from "./habitView";
import { isoRange, sleepDurationMinutes, parseISO } from "./date";

/*
  Weekly challenges — evaluated against the last 7 days. All derived from logged data.

  Two things keep them from going stale or irrelevant:
    - Personalization: a challenge only appears if it fits how the user actually uses the app
      (no "Train 3×" when they don't train, no sleep goal when they never log sleep).
    - Rotation: the optional pool is rotated by calendar week, so the visible set changes week
      to week instead of showing the same fixed list forever.
  Titles/units are English keys, translated at render time.
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

  // ---- Relevance signals: does this challenge fit how the user actually uses the app? ----
  const recentSet = new Set(isoRange(today, 21));
  const sportEnabled = data.settings.areas.some((a) => a.key === "sport" && a.enabled);
  const activeSportHabit = data.habits.some(
    (h) => !h.archived && h.area === "sport" && h.kind === "build",
  );
  const recentlyTrained = data.workouts.some((w) => recentSet.has(w.date));
  // Training only stays on the board while the user is actually training. If they stop (injury,
  // break) it drops off after ~3 weeks instead of nagging "Train 3×" they can't act on.
  const trainsRelevant = sportEnabled && (activeSportHabit || recentlyTrained);
  const hasBuildHabits = data.habits.some((h) => !h.archived && h.kind === "build");
  const logsSleep = data.sleep.length > 0;
  const journals = data.journal.length > 0;

  type Cand = Challenge & { relevant: boolean; core?: boolean };
  const candidates: Cand[] = [
    { id: "train", title: "Train {n}× this week", icon: "🏋️", current: workouts, target: 3, done: workouts >= 3, relevant: trainsRelevant },
    { id: "logall", title: "Log all 7 days", icon: "📅", current: daysLogged, target: 7, done: daysLogged >= 7, relevant: true, core: true },
    { id: "sleep", title: "Average {h}h sleep", icon: "😴", current: avgSleepH, target: 7.5, done: avgSleepH >= 7.5, relevant: logsSleep },
    { id: "habits", title: "Hit {n}% of your habits", icon: "✅", current: habitRate, target: 80, done: habitRate >= 80, relevant: hasBuildHabits },
    { id: "journal", title: "Write 3 journal entries", icon: "📔", current: journal, target: 3, done: journal >= 3, relevant: journals },
    { id: "checkin", title: "Check in on 5 days", icon: "📝", current: checkins, target: 5, done: checkins >= 5, relevant: true, core: true },
  ];

  const applicable = candidates.filter((c) => c.relevant);
  const core = applicable.filter((c) => c.core);
  const optional = applicable.filter((c) => !c.core);

  // Rotate the optional pool by calendar week so the visible set changes over time. Anything
  // already completed this week is kept visible (never hide a win); the rest fills up to the cap.
  const SHOW_OPTIONAL = 3;
  let chosen = optional;
  if (optional.length > SHOW_OPTIONAL) {
    const weekIndex = Math.floor(parseISO(today).getTime() / (7 * 86400000));
    const shift = ((weekIndex % optional.length) + optional.length) % optional.length;
    const rotated = [...optional.slice(shift), ...optional.slice(0, shift)];
    const done = rotated.filter((c) => c.done);
    const rest = rotated.filter((c) => !c.done);
    chosen = [...done, ...rest].slice(0, Math.max(SHOW_OPTIONAL, done.length));
  }

  return [...core, ...chosen].map(({ id, title, icon, current, target, done }) => ({
    id,
    title,
    icon,
    current,
    target,
    done,
  }));
}
