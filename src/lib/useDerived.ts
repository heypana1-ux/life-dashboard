"use client";

import { useMemo } from "react";
import { useStore } from "./store";
import { computeDay, computeHistory } from "./score";
import { addDays, todayISO } from "./date";
import { AppData, AreaKey, DayScore } from "./types";
import { buildInsights, Insight } from "./insights";

export interface Derived {
  today: string;
  /** Full day-by-day history from earliest data to today. */
  history: DayScore[];
  /** Map date -> DayScore for quick lookup. */
  byDate: Map<string, DayScore>;
  todayScore: DayScore | undefined;
  yesterdayScore: DayScore | undefined;
  /** Rolling 7-day average of the Life Score (excludes empty days). */
  avg7: number;
  insights: Insight[];
  firstDate: string;
}

export interface Headline {
  score: number;
  /** The day the number actually belongs to. */
  date: string;
  /** True when it is yesterday's score, still standing because today is untouched. */
  carriedOver: boolean;
}

/**
 * A fresh day starts with nothing logged, so a live score would read 0 from midnight until
 * the first habit is ticked — which looks like a collapse rather than a blank slate.
 *
 * So yesterday's score stays on screen through the first half of the new day, and steps aside
 * the moment either of two things happens: you log something today, or it is midday. After
 * that the day stands on its own, however it is going.
 */
export function headlineScore(
  liveScore: number,
  yesterday: DayScore | undefined,
  today: string,
  now = new Date(),
): Headline {
  const CARRY_UNTIL_HOUR = 12;
  if (liveScore > 0 || now.getHours() >= CARRY_UNTIL_HOUR || !yesterday || yesterday.lifeScore <= 0) {
    return { score: liveScore, date: today, carriedOver: false };
  }
  return { score: yesterday.lifeScore, date: yesterday.date, carriedOver: true };
}

function earliestDataDate(data: AppData, fallback: string): string {
  const dates: string[] = [];
  for (const l of data.habitLogs) dates.push(l.date);
  for (const r of data.reviews) dates.push(r.date);
  for (const s of data.sleep) dates.push(s.date);
  for (const j of data.journal) dates.push(j.date);
  if (dates.length === 0) return fallback;
  return dates.reduce((a, b) => (a < b ? a : b));
}

export function useDerived(): Derived {
  const { data } = useStore();
  return useMemo(() => {
    const today = todayISO();
    const fallback = addDays(today, -44);
    let firstDate = earliestDataDate(data, fallback);
    if (firstDate > today) firstDate = today;

    const history = computeHistory(data, firstDate, today);
    const byDate = new Map(history.map((h) => [h.date, h]));

    const todayScore = byDate.get(today);
    const yesterdayScore = byDate.get(addDays(today, -1));

    const last7 = history.filter((h) => h.lifeScore > 0).slice(-7);
    const avg7 = last7.length
      ? Math.round(last7.reduce((a, b) => a + b.lifeScore, 0) / last7.length)
      : 0;

    const insights = buildInsights(data, history, data.settings.language);

    return {
      today,
      history,
      byDate,
      todayScore,
      yesterdayScore,
      avg7,
      insights,
      firstDate,
    };
  }, [data]);
}

/** Category score for today computed live (so the dashboard updates as you log). */
export function useTodayComputation() {
  const { data } = useStore();
  return useMemo(() => computeDay(data, todayISO()), [data]);
}

export type { AreaKey };
