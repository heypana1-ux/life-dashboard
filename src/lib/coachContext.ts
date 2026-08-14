import { AppData, DayScore, Language } from "./types";
import { analyze } from "./analysis";
import { habitsForToday } from "./habitView";
import { aboutSummary } from "./about";
import { AREA_LABELS } from "./defaults";
import { addDays, ageFrom, fmtDuration, sleepDurationMinutes, todayISO, weekdayLabel, weekdayOf } from "./date";
import { weekAnchor } from "./recap";

/*
  Builds the compact, privacy-conscious snapshot the AI coach is allowed to see. This is the
  heart of the "engine computes, model interprets" design: we send *derived summaries and the
  analysis engine's conclusions*, never raw journal text, health notes or finance amounts.
  The model reasons over these numbers rather than the user's private entries.
*/

export interface CoachContext {
  /** Human-readable block sent to the model. */
  text: string;
}

function line(parts: (string | number | null | undefined)[]): string {
  return parts.filter((p) => p !== null && p !== undefined && p !== "").join(" ");
}

export function buildCoachContext(data: AppData, history: DayScore[]): CoachContext {
  const lang = data.settings.language;
  const today = todayISO();
  const byDate = new Map(history.map((h) => [h.date, h]));
  const report = analyze(data, history, lang);

  const L: string[] = [];

  // Who / when
  const name = data.settings.profile.name?.split(" ")[0];
  const birth = data.settings.profile.birthDate;
  const age = birth ? ageFrom(birth) : null;
  L.push(line([
    "Today is", weekdayLabel(weekdayOf(today), true) + ",", today + ".",
    name ? `The user's name is ${name}.` : "",
    age ? `They are ${age} years old.` : "",
  ]));

  // Self-reported profile (the "About you" questionnaire)
  const about = aboutSummary(data.settings.about);
  if (about) L.push(`About the user (self-reported):\n${about}`);

  // Enabled areas
  const enabled = data.settings.areas.filter((a) => a.enabled).map((a) => AREA_LABELS[a.key]);
  if (enabled.length) L.push(`Tracked areas: ${enabled.join(", ")}.`);

  // Score snapshot
  const todayScore = byDate.get(today);
  const scored = history.filter((h) => h.lifeScore > 0);
  const last7 = scored.slice(-7);
  const prev7 = scored.slice(-14, -7);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const avg7 = avg(last7.map((h) => h.lifeScore));
  const avgPrev7 = avg(prev7.map((h) => h.lifeScore));
  L.push(line([
    "Life Score:",
    todayScore?.lifeScore ? `today ${todayScore.lifeScore},` : "not logged today,",
    `7-day average ${avg7}`,
    avgPrev7 ? `(previous week ${avgPrev7}, ${avg7 - avgPrev7 >= 0 ? "+" : ""}${avg7 - avgPrev7}).` : ".",
    scored.length ? `Rating (ELO) ${scored[scored.length - 1].elo}.` : "",
  ]));

  // Recent 14-day series (compact)
  const series = history.slice(-14).map((h) => (h.lifeScore > 0 ? h.lifeScore : "–")).join(", ");
  if (scored.length) L.push(`Last 14 days of Life Score: ${series}.`);

  // Today's category scores
  if (todayScore && Object.keys(todayScore.categories).length) {
    const cats = Object.entries(todayScore.categories)
      .map(([k, v]) => `${AREA_LABELS[k as keyof typeof AREA_LABELS] ?? k} ${v}`)
      .join(", ");
    L.push(`Today's area scores: ${cats}.`);
  }

  // Today's goals
  const items = habitsForToday(data, today);
  const builds = items.filter((g) => g.habit.kind === "build");
  const reduces = items.filter((g) => g.habit.kind === "reduce");
  if (builds.length) {
    const done = builds.filter((g) => g.log?.done).map((g) => g.habit.name);
    const open = builds.filter((g) => !g.log?.done).map((g) => g.habit.name);
    L.push(line([
      `Today's habits: ${builds.length} scheduled.`,
      done.length ? `Done: ${done.join(", ")}.` : "",
      open.length ? `Still open: ${open.join(", ")}.` : "",
    ]));
  }
  const slipped = reduces.filter((g) => g.log?.done).map((g) => g.habit.name);
  if (slipped.length) L.push(`Watch-list behaviours that occurred today: ${slipped.join(", ")}.`);

  // Sleep last night
  const sleep = data.sleep.find((s) => s.date === today) ?? data.sleep.find((s) => s.date === addDays(today, -1));
  if (sleep) {
    const dur = sleepDurationMinutes(sleep.bedTime, sleep.wakeTime, sleep.fallAsleepMinutes ?? 0);
    L.push(`Recent sleep: ${fmtDuration(dur)}, quality ${sleep.quality}/10.`);
  }

  // Activity counts last 7 days
  const wk = new Set(Array.from({ length: 7 }, (_, i) => addDays(today, -i)));
  const workouts7 = data.workouts.filter((w) => wk.has(w.date)).length;
  if (data.workouts.length) L.push(`Workouts in the last 7 days: ${workouts7}.`);

  // Weekly review focus
  const lastReview = [...data.weeklyReviews]
    .filter((r) => r.weekOf <= weekAnchor(today))
    .sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1))[0];
  if (lastReview?.focus) L.push(`The user's focus from their last weekly review: "${lastReview.focus}".`);

  // Analysis engine conclusions — the important part.
  L.push(`\nAnalysis engine summary: ${report.verdict.summary}`);
  const strengths = report.findings.filter((f) => f.kind === "strength" || f.kind === "insight").slice(0, 5);
  const watches = report.findings.filter((f) => f.kind === "watch").slice(0, 4);
  const tips = report.findings.filter((f) => f.kind === "tip").slice(0, 4);
  if (strengths.length) L.push("Detected patterns / strengths:\n" + strengths.map((f) => `- ${f.detail}`).join("\n"));
  if (watches.length) L.push("Things to watch:\n" + watches.map((f) => `- ${f.detail}`).join("\n"));
  if (tips.length) L.push("Engine suggestions:\n" + tips.map((f) => `- ${f.detail}`).join("\n"));
  if (report.drivers.positive.length)
    L.push("Biggest positive drivers of the score: " + report.drivers.positive.map((d) => `${d.label} (+${d.delta})`).join(", ") + ".");
  if (report.drivers.negative.length)
    L.push("Biggest negative drivers: " + report.drivers.negative.map((d) => `${d.label} (${d.delta})`).join(", ") + ".");

  if (scored.length < 5) {
    L.push("\nNote: there are only a few days of data so far, so patterns are weak — keep answers cautious and encourage more logging.");
  }

  return { text: L.join("\n") };
}

/** Language name for the system prompt so the model replies in the user's language. */
export function langName(lang: Language): string {
  return lang === "de" ? "German" : "English";
}
