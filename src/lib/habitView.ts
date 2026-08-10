import { AppData, Habit, HabitLog } from "./types";
import { isDueOn } from "./score";
import { isoRange, parseISO } from "./date";

export interface HabitToday {
  habit: Habit;
  log?: HabitLog;
  /** Whether this habit is a target for today (build & due, or weekly still open). */
  due: boolean;
  /** For weekly habits: done this week / target. */
  weekDone?: number;
  weekTarget?: number;
}

export function logOf(data: AppData, habitId: string, date: string): HabitLog | undefined {
  return data.habitLogs.find((l) => l.habitId === habitId && l.date === date);
}

/** The habits that should appear in "Today" for a given date. */
export function habitsForToday(data: AppData, date: string): HabitToday[] {
  const active = data.habits.filter(
    (h) => !h.archived && parseISO(h.createdAt) <= parseISO(date),
  );
  const out: HabitToday[] = [];
  for (const h of active) {
    const log = logOf(data, h.id, date);
    if (h.kind === "build") {
      if (h.schedule.type === "weekly") {
        const target = h.schedule.timesPerWeek ?? 1;
        const window = isoRange(date, 7);
        const weekDone = window.filter((d) => logOf(data, h.id, d)?.done).length;
        out.push({ habit: h, log, due: true, weekDone, weekTarget: target });
      } else if (isDueOn(h, date)) {
        out.push({ habit: h, log, due: true });
      }
    } else {
      // reduce habits: always shown as "avoid" targets
      out.push({ habit: h, log, due: true });
    }
  }
  // order: build-due first, then reduce
  return out.sort((a, b) => Number(a.habit.kind === "reduce") - Number(b.habit.kind === "reduce"));
}

export const priorityRank = { high: 0, medium: 1, low: 2 } as const;
