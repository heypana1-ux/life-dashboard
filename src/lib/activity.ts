import { AppData, Habit } from "./types";
import { isDueOn } from "./score";
import { logOf } from "./habitView";
import { isRestDay } from "./streak";
import { parseISO, todayISO } from "./date";

/*
  One shared answer to "did I do this on that day?", so the same boxes can be drawn on
  Statistics (a month or a year), on Today (this week) and on a habit card.

  Three states, not two, because "not done" and "was never on the plan" are different things
  and colouring them the same would invent misses that never happened:
    done — you did it
    open — it was on the plan for that day and it didn't happen
    off  — the day is in the future, before the habit existed, a rest day, or simply not
           scheduled; nothing to judge
*/

export type ActivityState = "done" | "open" | "off";

export interface ActivitySource {
  id: string;
  /** App sources carry an i18n key; a habit carries the name the user gave it. */
  name: string;
  translate: boolean;
}

/** Everything with a daily on/off rhythm, habits first — those are what people track. */
export function activitySources(data: AppData): ActivitySource[] {
  const habits = data.habits
    .filter((h) => !h.archived)
    .map((h) => ({ id: `habit:${h.id}`, name: h.name, translate: false }));
  const app: ActivitySource[] = [{ id: "app:goals", name: "All goals", translate: true }];
  if (data.workouts.length) app.push({ id: "app:workout", name: "Training", translate: true });
  if (data.journal.length) app.push({ id: "app:journal", name: "Journal", translate: true });
  if (data.reviews.length) app.push({ id: "app:checkin", name: "Daily check-in", translate: true });
  if (data.sleep.length) app.push({ id: "app:sleep", name: "Sleep", translate: true });
  if (data.focusSessions.length) app.push({ id: "app:focus", name: "Focus", translate: true });
  return [...app, ...habits];
}

function habitState(data: AppData, habit: Habit, date: string): ActivityState {
  if (parseISO(date) < parseISO(habit.createdAt)) return "off";
  const log = logOf(data, habit.id, date);
  // A reduce habit is won by NOT doing it, so an untouched day is a good day.
  if (habit.kind === "reduce") return log?.done ? "open" : "done";
  if (log?.done) return "done";
  if (isRestDay(data.settings, date)) return "off";
  // A weekly target ("3× a week") has no due days — every day is a chance, none is a miss.
  if (habit.schedule.type === "weekly") return "off";
  return isDueOn(habit, date) ? "open" : "off";
}

/** The day counts as won when every habit due that day was done — and something was due. */
function goalsState(data: AppData, date: string): ActivityState {
  const due = data.habits.filter(
    (h) =>
      !h.archived &&
      h.kind === "build" &&
      h.schedule.type !== "weekly" &&
      parseISO(h.createdAt) <= parseISO(date) &&
      isDueOn(h, date),
  );
  if (due.length === 0) return "off";
  return due.every((h) => logOf(data, h.id, date)?.done) ? "done" : "open";
}

/** State per date for one source. Dates are plain ISO days, in whatever order you pass them. */
export function activityStates(data: AppData, sourceId: string, dates: string[]): ActivityState[] {
  const today = todayISO();
  const habit = sourceId.startsWith("habit:")
    ? data.habits.find((h) => h.id === sourceId.slice(6))
    : undefined;

  // Build the day sets once instead of scanning every collection per date.
  const has = (list: { date: string }[]) => new Set(list.map((x) => x.date));
  const days =
    sourceId === "app:workout" ? has(data.workouts)
    : sourceId === "app:journal" ? has(data.journal)
    : sourceId === "app:checkin" ? has(data.reviews)
    : sourceId === "app:sleep" ? has(data.sleep)
    : sourceId === "app:focus" ? has(data.focusSessions)
    : null;

  return dates.map((date) => {
    if (date > today) return "off"; // nothing to say about a day that hasn't happened
    if (habit) return habitState(data, habit, date);
    if (sourceId === "app:goals") return goalsState(data, date);
    if (days) return days.has(date) ? "done" : "open";
    return "off";
  });
}

/** Monday-first index of a date: Mon = 0 … Sun = 6. */
export function mondayIndex(dateISO: string): number {
  return (parseISO(dateISO).getDay() + 6) % 7;
}

/** The seven days of the ISO week containing `dateISO`, Monday first. */
export function weekDays(dateISO: string): string[] {
  const start = parseISO(dateISO);
  start.setDate(start.getDate() - mondayIndex(dateISO));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}
