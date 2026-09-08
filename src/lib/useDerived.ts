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
 * A morning is not a day.
 *
 * The live score of a day that has barely started is not a bad score, it is an incomplete one:
 * log last night's sleep at breakfast and the number is that single entry, weighed against a
 * full day's worth of habits nobody has had the chance to do yet. Shown as "your score" it
 * reads as a collapse — 98 yesterday, 14 this morning — when nothing has actually gone wrong.
 *
 * So until midday the number stays on yesterday, the last day that was actually finished.
 * The one exception is a morning that has already passed yesterday: there is no dip left to
 * smooth over, so the real, better number wins. Either way the score shown belongs to a real
 * day, and the label says which one.
 */
export function headlineScore(
  liveScore: number,
  yesterday: DayScore | undefined,
  today: string,
  now = new Date(),
): Headline {
  const CARRY_UNTIL_HOUR = 12;
  const prev = yesterday?.lifeScore ?? 0;
  if (now.getHours() < CARRY_UNTIL_HOUR && prev > 0 && liveScore <= prev) {
    return { score: prev, date: yesterday!.date, carriedOver: true };
  }
  return { score: liveScore, date: today, carriedOver: false };
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
