import { AppData, DayScore, Language } from "./types";
import { analyze } from "./analysis";
import { habitsForToday } from "./habitView";
import { translate } from "./i18n";
import { AREA_LABELS } from "./defaults";
import { AreaKey } from "./types";
import { fmtShort, monthLabel, sleepDurationMinutes, weekdayLabel, weekdayOf } from "./date";

/*
  A deterministic, no-AI weekly recap written straight from the engine's numbers. It reads like
  a short paragraph a coach might write, but costs nothing and never invents anything — every
  clause is backed by the last 7 logged days. The AI coach can add its own take on top.
*/

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function weeklyNarrative(data: AppData, history: DayScore[], lang: Language = "en"): string {
  const t = (k: string, v?: Record<string, string | number>) => translate(lang, k, v);
  const scored = history.filter((h) => h.lifeScore > 0);
  if (scored.length < 4) return t("Log a few more days and a written weekly recap will appear here.");

  const last7 = scored.slice(-7);
  const prev7 = scored.slice(-14, -7);
  const a7 = Math.round(mean(last7.map((h) => h.lifeScore)));
  const p7 = prev7.length ? Math.round(mean(prev7.map((h) => h.lifeScore))) : null;
  const trend = p7 != null ? a7 - p7 : 0;
  const best = last7.reduce((m, h) => (h.lifeScore > m.lifeScore ? h : m));
  const week = new Set(last7.map((h) => h.date));

  const sentences: string[] = [];

  // 1) Average + trend
  const trendWord = trend >= 3 ? t("up from {p}", { p: p7 ?? 0 }) : trend <= -3 ? t("down from {p}", { p: p7 ?? 0 }) : t("about steady");
  sentences.push(t("This week your Life Score averaged {a} ({trend}).", { a: a7, trend: trendWord }));

  // 2) Best day
  sentences.push(t("Your standout day was {day} ({date}) at {score}.", { day: t(weekdayLabel(weekdayOf(best.date))), date: fmtShort(best.date), score: best.lifeScore }));

  // 3) Activity: workouts + sleep
  const workouts = data.workouts.filter((w) => week.has(w.date)).length;
  const sleeps = data.sleep.filter((s) => week.has(s.date));
  const activity: string[] = [];
  if (data.workouts.length) activity.push(t("{n} workout(s)", { n: workouts }));
  if (sleeps.length) {
    const h = mean(sleeps.map((s) => sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0))) / 60;
    activity.push(t("~{h}h average sleep", { h: (Math.round(h * 10) / 10).toString() }));
  }
  // build-habit adherence
  let due = 0;
  let done = 0;
  for (const d of week) {
    for (const g of habitsForToday(data, d)) {
      if (g.habit.kind !== "build") continue;
      due += 1;
      if (g.log?.done) done += 1;
    }
  }
  if (due > 0) activity.push(t("{pct}% of habits done", { pct: Math.round((done / due) * 100) }));
  if (activity.length) sentences.push(t("Along the way: {list}.", { list: activity.join(", ") }));

  // 4) One engine takeaway + one suggestion
  const report = analyze(data, history, lang);
  const strength = report.findings.find((f) => f.kind === "strength" || f.kind === "insight");
  const tip = report.findings.find((f) => f.kind === "tip" || f.kind === "watch");
  if (strength) sentences.push(strength.detail);
  if (tip) sentences.push(t("Next week: {tip}", { tip: tip.detail }));

  return sentences.join(" ");
}

const NAR_AREAS: AreaKey[] = ["productivity", "sport", "sleep", "habits", "learning", "creativity", "reflection"];

/** A bigger, written monthly recap — the "State of You". */
export function monthlyNarrative(data: AppData, history: DayScore[], lang: Language = "en"): string {
  const t = (k: string, v?: Record<string, string | number>) => translate(lang, k, v);
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const inMonth = (d: string) => Number(d.slice(0, 4)) === y && Number(d.slice(5, 7)) - 1 === m;
  const inPrev = (d: string) => {
    const py = m === 0 ? y - 1 : y;
    const pm = m === 0 ? 11 : m - 1;
    return Number(d.slice(0, 4)) === py && Number(d.slice(5, 7)) - 1 === pm;
  };
  const scored = history.filter((h) => h.lifeScore > 0);
  const cur = scored.filter((h) => inMonth(h.date));
  if (cur.length < 4) return t("Log a few more days this month and your State of You will appear here.");
  const prev = scored.filter((h) => inPrev(h.date));

  const avg = Math.round(mean(cur.map((h) => h.lifeScore)));
  const prevAvg = prev.length ? Math.round(mean(prev.map((h) => h.lifeScore))) : null;
  const trend = prevAvg != null ? avg - prevAvg : 0;
  const monthSet = new Set(cur.map((h) => h.date));

  const sentences: string[] = [];
  const trendWord = trend >= 3 ? t("up from {p} last month", { p: prevAvg ?? 0 }) : trend <= -3 ? t("down from {p} last month", { p: prevAvg ?? 0 }) : t("about steady");
  sentences.push(t("{month}: your Life Score averaged {a} across {n} logged days ({trend}).", { month: t(monthLabel(m)), a: avg, n: cur.length, trend: trendWord }));

  // Most-improved area vs last month.
  const areaAvg = (days: DayScore[], a: AreaKey) => {
    const xs = days.map((h) => h.categories[a]).filter((v): v is number => v != null);
    return xs.length >= 3 ? mean(xs) : null;
  };
  let improved: { a: AreaKey; delta: number } | null = null;
  if (prev.length >= 4) {
    for (const a of NAR_AREAS) {
      const now = areaAvg(cur, a);
      const before = areaAvg(prev, a);
      if (now == null || before == null) continue;
      const delta = now - before;
      if (delta >= 6 && (!improved || delta > improved.delta)) improved = { a, delta: Math.round(delta) };
    }
  }
  if (improved) sentences.push(t("Most improved: {area}, up {d} points on last month.", { area: t(AREA_LABELS[improved.a]), d: improved.delta }));

  // Activity totals
  const workouts = data.workouts.filter((w) => monthSet.has(w.date)).length;
  const journal = data.journal.filter((j) => monthSet.has(j.date)).length;
  const sleeps = data.sleep.filter((s) => monthSet.has(s.date));
  const activity: string[] = [];
  if (data.workouts.length) activity.push(t("{n} workouts", { n: workouts }));
  if (data.journal.length) activity.push(t("{n} journal entries", { n: journal }));
  if (sleeps.length) {
    const h = mean(sleeps.map((s) => sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0))) / 60;
    activity.push(t("~{h}h average sleep", { h: (Math.round(h * 10) / 10).toString() }));
  }
  if (activity.length) sentences.push(t("The month in numbers: {list}.", { list: activity.join(", ") }));

  // Top habit this month (build only).
  const buildIds = new Set(data.habits.filter((h) => h.kind === "build" && !h.archived).map((h) => h.id));
  const counts = new Map<string, number>();
  for (const l of data.habitLogs) if (monthSet.has(l.date) && l.done && buildIds.has(l.habitId)) counts.set(l.habitId, (counts.get(l.habitId) ?? 0) + 1);
  let topHabit: { name: string; n: number } | null = null;
  for (const [id, n] of counts) {
    const hb = data.habits.find((x) => x.id === id);
    if (hb && (!topHabit || n > topHabit.n)) topHabit = { name: hb.name, n };
  }
  if (topHabit && topHabit.n >= 5) sentences.push(t("Your most consistent habit was “{name}” ({n} days).", { name: topHabit.name, n: topHabit.n }));

  // One engine takeaway + one suggestion.
  const report = analyze(data, history, lang);
  const strength = report.findings.find((f) => f.kind === "strength" || f.kind === "insight");
  const tip = report.findings.find((f) => f.kind === "tip" || f.kind === "watch");
  if (strength) sentences.push(strength.detail);
  if (tip) sentences.push(t("Going into next month: {tip}", { tip: tip.detail }));

  return sentences.join(" ");
}
