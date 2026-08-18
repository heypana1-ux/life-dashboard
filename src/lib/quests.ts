import { AppData } from "./types";
import { habitsForToday } from "./habitView";
import { parseISO, isoRange } from "./date";

/*
  Daily quests — small, quick tasks evaluated against TODAY (unlike weekly challenges, which
  span 7 days). A rotating set of three is shown each day; completing one lets you claim a
  small points bonus. All derived from logged data. Titles are English keys.
*/

export interface Quest {
  id: string;
  title: string; // English key
  icon: string;
  current: number;
  target: number;
  done: boolean;
}

/** Points granted for claiming one completed daily quest. */
export const QUEST_POINTS = 6;

export function dailyQuests(data: AppData, today: string): Quest[] {
  const items = habitsForToday(data, today);
  const builds = items.filter((g) => g.habit.kind === "build");
  const buildsDone = builds.filter((g) => g.log?.done).length;
  const reduces = items.filter((g) => g.habit.kind === "reduce");
  const slips = reduces.filter((g) => g.log?.done).length;

  const sleepLogged = data.sleep.some((s) => s.date === today) ? 1 : 0;
  const checkin = data.reviews.some((r) => r.date === today) ? 1 : 0;
  const journal = data.journal.some((j) => j.date === today) ? 1 : 0;
  const workout = data.workouts.some((w) => w.date === today) ? 1 : 0;
  const focus = data.focus.find((f) => f.date === today);
  const focusDone = focus && focus.items.length > 0 && focus.items.every((i) => i.done) ? 1 : 0;

  // Relevance signals (avoid quests the user can't act on).
  const recentSet = new Set(isoRange(today, 21));
  const trains =
    data.settings.areas.some((a) => a.key === "sport" && a.enabled) &&
    (data.habits.some((h) => !h.archived && h.area === "sport" && h.kind === "build") ||
      data.workouts.some((w) => recentSet.has(w.date)));

  type Cand = Quest & { relevant: boolean };
  const habitTarget = Math.min(3, Math.max(1, builds.length));
  const pool: Cand[] = [
    { id: "habits3", title: "Complete {n} habits today", icon: "✅", current: buildsDone, target: habitTarget, done: buildsDone >= habitTarget, relevant: builds.length > 0 },
    { id: "allhabits", title: "Complete every habit today", icon: "🎯", current: buildsDone, target: builds.length, done: builds.length > 0 && buildsDone >= builds.length, relevant: builds.length >= 2 },
    { id: "checkin", title: "Do today's check-in", icon: "📝", current: checkin, target: 1, done: checkin > 0, relevant: true },
    { id: "sleep", title: "Log your sleep", icon: "😴", current: sleepLogged, target: 1, done: sleepLogged > 0, relevant: true },
    { id: "journal", title: "Write a journal entry", icon: "📔", current: journal, target: 1, done: journal > 0, relevant: true },
    { id: "workout", title: "Log a workout", icon: "🏋️", current: workout, target: 1, done: workout > 0, relevant: trains },
    { id: "focus", title: "Finish your morning focus", icon: "🌅", current: focusDone, target: 1, done: focusDone > 0, relevant: !!focus && focus.items.length > 0 },
    { id: "clean", title: "Avoid your watch-list today", icon: "🛡️", current: slips === 0 ? 1 : 0, target: 1, done: reduces.length > 0 && slips === 0, relevant: reduces.length > 0 },
  ];

  const applicable = pool.filter((c) => c.relevant);
  // Rotate the pool by calendar day so the trio changes daily, but keep any already-done quest
  // visible so a claim is never hidden.
  const dayIndex = Math.floor(parseISO(today).getTime() / 86400000);
  const shift = applicable.length ? ((dayIndex % applicable.length) + applicable.length) % applicable.length : 0;
  const rotated = [...applicable.slice(shift), ...applicable.slice(0, shift)];
  const done = rotated.filter((c) => c.done);
  const rest = rotated.filter((c) => !c.done);
  const chosen = [...done, ...rest].slice(0, Math.max(3, done.length));

  return chosen.map(({ id, title, icon, current, target, done }) => ({ id, title, icon, current, target, done }));
}
