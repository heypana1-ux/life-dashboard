import { AppData, DayScore, Language } from "./types";
import { analyze } from "./analysis";
import { habitsForToday } from "./habitView";
import { translate } from "./i18n";
import { fmtShort, sleepDurationMinutes, weekdayLabel, weekdayOf } from "./date";

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
