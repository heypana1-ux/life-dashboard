import { Goal } from "./types";
import { addDays, parseISO, todayISO } from "./date";

/*
  A rough pace/ETA forecast for a goal: extrapolate the progress made since the goal was
  created to estimate when it reaches 100%, and compare that to the deadline. Linear and
  descriptive — it assumes you keep up your average pace, nothing more.
*/

export type GoalStatus = "done" | "unknown" | "stalled" | "onTrack" | "behind";

export interface GoalForecast {
  status: GoalStatus;
  pace: number; // progress points per day
  daysLeft: number | null; // days to reach 100% at current pace
  etaDate: string | null; // projected completion date (YYYY-MM-DD)
  daysToDeadline: number | null;
}

export function goalForecast(goal: Goal, today = todayISO()): GoalForecast {
  const daysToDeadline = goal.deadline
    ? Math.round((parseISO(goal.deadline).getTime() - parseISO(today).getTime()) / 86400000)
    : null;
  if (goal.progress >= 100) return { status: "done", pace: 0, daysLeft: 0, etaDate: null, daysToDeadline };

  const created = goal.createdAt ? goal.createdAt.slice(0, 10) : today;
  const daysSince = Math.max(
    1,
    Math.round((parseISO(today).getTime() - parseISO(created).getTime()) / 86400000),
  );
  const pace = goal.progress / daysSince; // points/day since creation

  // Not enough signal yet: brand-new goal or no progress.
  if (pace <= 0.05) {
    return { status: daysSince < 4 ? "unknown" : "stalled", pace: 0, daysLeft: null, etaDate: null, daysToDeadline };
  }

  const daysLeft = Math.ceil((100 - goal.progress) / pace);
  const etaDate = addDays(today, Math.min(daysLeft, 3650));
  const status: GoalStatus = daysToDeadline != null ? (daysLeft <= daysToDeadline ? "onTrack" : "behind") : "onTrack";
  return { status, pace, daysLeft, etaDate, daysToDeadline };
}
