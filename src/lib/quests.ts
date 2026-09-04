import { AppData } from "./types";
import { habitsForToday } from "./habitView";
import { isoRange, sleepDurationMinutes } from "./date";

/*
  Daily quests — small, quick tasks evaluated against TODAY (unlike weekly challenges, which
  span 7 days). Three are shown each day; completing one lets you claim a small points bonus.
  All derived from logged data. Titles are English keys.

  Two rules keep the trio from going stale:
    - Relevance: a quest only enters the draw if the user can actually act on it (no "log a
      workout" for someone who doesn't train, no watch-list quest without a watch-list).
    - A day-seeded shuffle picks the three. The old version rotated by one position and then
      pulled every completed quest to the front, which meant that once you reliably did your
      check-in, sleep and journal, those exact three showed up forever.
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

/** mulberry32 seeded from the date — same day, same three quests; tomorrow, a different draw. */
function dayShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let x = Math.imul(h ^ (h >>> 15), 1 | h);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function dailyQuests(data: AppData, today: string): Quest[] {
  const items = habitsForToday(data, today);
  const builds = items.filter((g) => g.habit.kind === "build");
  const buildsDone = builds.filter((g) => g.log?.done).length;
  const reduces = items.filter((g) => g.habit.kind === "reduce");
  const slips = reduces.filter((g) => g.log?.done).length;

  const review = data.reviews.find((r) => r.date === today);
  const journalToday = data.journal.filter((j) => j.date === today);
  const workoutsToday = data.workouts.filter((w) => w.date === today);
  const sleepToday = data.sleep.find((s) => s.date === today);
  const sleepMin = sleepToday
    ? sleepDurationMinutes(sleepToday.bedTime, sleepToday.wakeTime, sleepToday.fallAsleepMinutes ?? 0)
    : 0;
  const sleepTarget = data.settings.sleepTargetMinutes || 450;
  const focusDay = data.focus.find((f) => f.date === today);
  const focusDone = focusDay && focusDay.items.length > 0 && focusDay.items.every((i) => i.done) ? 1 : 0;
  const deepMin = (data.focusSessions ?? []).filter((s) => s.date === today).reduce((a, s) => a + s.minutes, 0);
  const focusTarget = data.settings.focusTargetMinutes || 120;
  const weightToday = data.weight.some((w) => w.date === today) ? 1 : 0;
  const wheelToday = (data.wheelChecks ?? []).some((w) => w.date === today) ? 1 : 0;
  const txToday = data.finances.transactions.filter((tx) => tx.date === today).length;
  const measureToday = (data.measurements ?? []).some((m) => m.date === today) ? 1 : 0;
  const longWorkout = workoutsToday.some((w) => w.durationMin >= 30) ? 1 : 0;
  const wentWell = review?.wentWell?.trim() ? 1 : 0;
  const photo = journalToday.some((j) => (j.photos?.length ?? 0) > 0) ? 1 : 0;

  // ---- Relevance: does the user actually use this part of the app? ----
  const recent = new Set(isoRange(today, 21));
  const usedRecently = (dates: string[]) => dates.some((d) => recent.has(d));
  const trains =
    data.settings.areas.some((a) => a.key === "sport" && a.enabled) &&
    (data.habits.some((h) => !h.archived && h.area === "sport" && h.kind === "build") ||
      usedRecently(data.workouts.map((w) => w.date)));
  const logsSleep = data.sleep.length > 0;
  const journals = data.journal.length > 0;
  const doesDeepWork = (data.focusSessions ?? []).length > 0;
  const tracksWeight = data.weight.length > 0;
  const tracksMoney =
    data.settings.areas.some((a) => a.key === "finances" && a.enabled) && data.finances.transactions.length > 0;
  const tracksBody = (data.measurements ?? []).length > 0;
  const usesWheel = (data.wheelChecks ?? []).length > 0;

  type Cand = Quest & { relevant: boolean };
  const habitTarget = Math.min(3, Math.max(1, builds.length));
  const pool: Cand[] = [
    // Habits
    { id: "habits3", title: "Complete {n} habits today", icon: "✅", current: buildsDone, target: habitTarget, done: buildsDone >= habitTarget, relevant: builds.length > 0 },
    { id: "allhabits", title: "Complete every habit today", icon: "🎯", current: buildsDone, target: builds.length, done: builds.length > 0 && buildsDone >= builds.length, relevant: builds.length >= 2 },
    { id: "half", title: "Get halfway through your habits", icon: "🌗", current: buildsDone, target: Math.ceil(builds.length / 2), done: builds.length > 0 && buildsDone >= Math.ceil(builds.length / 2), relevant: builds.length >= 3 },
    { id: "clean", title: "A day without a slip", icon: "🛡️", current: slips === 0 ? 1 : 0, target: 1, done: reduces.length > 0 && slips === 0, relevant: reduces.length > 0 },
    // Reflection
    { id: "checkin", title: "Do today's check-in", icon: "📝", current: review ? 1 : 0, target: 1, done: !!review, relevant: true },
    { id: "wentwell", title: "Note one thing that went well", icon: "💭", current: wentWell, target: 1, done: wentWell > 0, relevant: true },
    { id: "journal", title: "Write a journal entry", icon: "📔", current: journalToday.length, target: 1, done: journalToday.length > 0, relevant: true },
    { id: "photo", title: "Add a photo to your journal", icon: "📸", current: photo, target: 1, done: photo > 0, relevant: journals },
    // Sleep
    { id: "sleep", title: "Log your sleep", icon: "😴", current: sleepToday ? 1 : 0, target: 1, done: !!sleepToday, relevant: true },
    { id: "sleeptarget", title: "Hit your sleep target", icon: "🌙", current: Math.round(sleepMin), target: sleepTarget, done: sleepMin >= sleepTarget, relevant: logsSleep },
    // Training
    { id: "workout", title: "Log a workout", icon: "🏋️", current: workoutsToday.length, target: 1, done: workoutsToday.length > 0, relevant: trains },
    { id: "workout30", title: "Train for 30 minutes", icon: "⏱️", current: longWorkout, target: 1, done: longWorkout > 0, relevant: trains },
    // Focus
    { id: "focus", title: "Finish your morning focus", icon: "🌅", current: focusDone, target: 1, done: focusDone > 0, relevant: !!focusDay && focusDay.items.length > 0 },
    { id: "deepwork", title: "Log a focus session", icon: "🧠", current: deepMin > 0 ? 1 : 0, target: 1, done: deepMin > 0, relevant: doesDeepWork },
    { id: "focustarget", title: "Reach your focus target", icon: "🎧", current: deepMin, target: focusTarget, done: deepMin >= focusTarget, relevant: doesDeepWork },
    // Body & money & life areas
    { id: "weight", title: "Step on the scale", icon: "⚖️", current: weightToday, target: 1, done: weightToday > 0, relevant: tracksWeight },
    { id: "measure", title: "Take a body measurement", icon: "📏", current: measureToday, target: 1, done: measureToday > 0, relevant: tracksBody },
    { id: "money", title: "Book today's spending", icon: "💶", current: txToday, target: 1, done: txToday > 0, relevant: tracksMoney },
    { id: "wheel", title: "Rate your wheel of life", icon: "🎡", current: wheelToday, target: 1, done: wheelToday > 0, relevant: usesWheel },
  ];
  // Nothing goal-shaped in here on purpose: goals carry no per-day timestamp, so a quest like
  // "move a goal forward" would read as permanently done for anyone with progress on one.

  const applicable = pool.filter((c) => c.relevant);
  const chosen = dayShuffle(applicable, today).slice(0, 3);
  return chosen.map(({ id, title, icon, current, target, done }) => ({ id, title, icon, current, target, done }));
}
