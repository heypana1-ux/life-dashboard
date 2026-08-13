import { AppData, AreaKey, DayScore, Language } from "./types";
import { AREA_LABELS } from "./defaults";
import { sleepDurationMinutes, weekdayLabel, weekdayOf } from "./date";
import { translate } from "./i18n";

/*
  "Analog" analysis engine — no AI. It pools everything the user logs (sleep, training,
  habits, reviews, journal, per-area scores) and cross-analyses it into a structured report:
  what's going well, what to watch, cross-category correlations, and concrete suggestions.

  Everything is grounded in the user's OWN data and phrased as association, never as medical
  or causal fact. Each generator needs a minimum sample and an effect size before it speaks.
*/

export type FindingKind = "strength" | "watch" | "insight" | "tip";

export interface Finding {
  id: string;
  kind: FindingKind;
  title: string;
  detail: string;
  weight: number; // ranking strength (higher = more prominent)
}

export interface AnalysisReport {
  verdict: { score: number; trend: number; label: string; summary: string };
  findings: Finding[];
}

const MIN = 5;

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}
function bedMin(bed: string): number {
  const [h, m] = bed.split(":").map(Number);
  return (h < 12 ? h + 24 : h) * 60 + m;
}

export function analyze(data: AppData, history: DayScore[], lang: Language = "en"): AnalysisReport {
  const t = (k: string, v?: Record<string, string | number>) => translate(lang, k, v);
  const wd = (n: number) => translate(lang, weekdayLabel(n, true));
  const area = (a: AreaKey) => translate(lang, AREA_LABELS[a]);
  const F: Finding[] = [];

  const withData = history.filter((h) => h.lifeScore > 0);
  const byDate = new Map(history.map((h) => [h.date, h]));
  const reviewOf = new Map(data.reviews.map((r) => [r.date, r]));

  // Training days (workouts + sport-habit completions).
  const sportHabits = new Set(data.habits.filter((h) => h.area === "sport" && h.kind === "build").map((h) => h.id));
  const trained = new Set<string>(data.workouts.map((w) => w.date));
  for (const l of data.habitLogs) if (l.done && sportHabits.has(l.habitId)) trained.add(l.date);
  const journaled = new Set(data.journal.map((j) => j.date));
  const reduceIds = new Set(data.habits.filter((h) => h.kind === "reduce").map((h) => h.id));
  const slipDates = new Set(data.habitLogs.filter((l) => l.done && reduceIds.has(l.habitId)).map((l) => l.date));
  const target = data.settings.sleepTargetMinutes;

  /** Split a metric into two groups by a per-date predicate, return effect if both are big enough. */
  function assoc(
    pred: (date: string) => boolean,
    metric: (date: string) => number | null,
    dates: string[],
  ): { diff: number; pct: number; a: number; b: number; nA: number; nB: number } | null {
    const A: number[] = [];
    const B: number[] = [];
    for (const d of dates) {
      const v = metric(d);
      if (v == null) continue;
      (pred(d) ? A : B).push(v);
    }
    if (A.length < MIN || B.length < MIN) return null;
    const a = mean(A);
    const b = mean(B);
    const diff = a - b;
    return { diff, pct: Math.round((Math.abs(diff) / Math.max(1, b)) * 100), a, b, nA: A.length, nB: B.length };
  }

  const reviewDates = data.reviews.map((r) => r.date);
  const scoreDates = withData.map((h) => h.date);
  const prod = (d: string) => reviewOf.get(d)?.productivity ?? null;
  const mood = (d: string) => reviewOf.get(d)?.mood ?? null;
  const life = (d: string) => byDate.get(d)?.lifeScore ?? null;
  const sleptEnough = (d: string) => {
    const s = data.sleep.find((x) => x.date === d);
    return s ? sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0) >= target : false;
  };
  const hasSleep = (d: string) => data.sleep.some((x) => x.date === d);

  // ---------- Correlations ----------
  // Sleep → productivity
  const sp = assoc(sleptEnough, (d) => (hasSleep(d) ? prod(d) : null), reviewDates.filter(hasSleep));
  if (sp && Math.abs(sp.diff) >= 0.5) {
    F.push({
      id: "sleep-prod",
      kind: sp.diff > 0 ? "insight" : "insight",
      title: t("Sleep ↔ productivity"),
      detail:
        sp.diff > 0
          ? t("On nights you hit your sleep target, your rated productivity is about {pct}% higher.", { pct: sp.pct })
          : t("More sleep isn't lifting your productivity in this window — the link is weak so far."),
      weight: 60 + Math.min(30, sp.pct),
    });
  }
  // Sleep → mood
  const sm = assoc(sleptEnough, (d) => (hasSleep(d) ? mood(d) : null), reviewDates.filter(hasSleep));
  if (sm && sm.diff >= 0.5) {
    F.push({
      id: "sleep-mood",
      kind: "insight",
      title: t("Sleep ↔ mood"),
      detail: t("Your mood averages {diff} points higher (out of 10) after hitting your sleep target.", { diff: sm.diff.toFixed(1) }),
      weight: 55 + sm.diff * 5,
    });
  }
  // Training → life score
  const tl = assoc((d) => trained.has(d), life, scoreDates);
  if (tl && tl.diff >= 3) {
    F.push({
      id: "train-life",
      kind: "insight",
      title: t("Training ↔ Life Score"),
      detail: t("On days you train, your Life Score is on average {diff} points higher.", { diff: Math.round(tl.diff) }),
      weight: 70 + tl.diff,
    });
  }
  // Training → mood
  const tm = assoc((d) => trained.has(d), mood, reviewDates);
  if (tm && tm.diff >= 0.5) {
    F.push({
      id: "train-mood",
      kind: "insight",
      title: t("Training ↔ mood"),
      detail: t("Your mood runs {diff}/10 higher on training days.", { diff: tm.diff.toFixed(1) }),
      weight: 58 + tm.diff * 5,
    });
  }
  // Slips → mood (negative)
  const slipMood = assoc((d) => slipDates.has(d), mood, reviewDates);
  if (slipMood && slipMood.diff <= -0.5) {
    F.push({
      id: "slip-mood",
      kind: "watch",
      title: t("Slip days ↔ mood"),
      detail: t("On days you slip on a reduce-habit, your mood is about {diff}/10 lower.", { diff: Math.abs(slipMood.diff).toFixed(1) }),
      weight: 60 + Math.abs(slipMood.diff) * 5,
    });
  }
  // Journaling → mood
  const jm = assoc((d) => journaled.has(d), mood, reviewDates);
  if (jm && jm.diff >= 0.5) {
    F.push({
      id: "journal-mood",
      kind: "insight",
      title: t("Journaling ↔ mood"),
      detail: t("Days you journal tend to come with a {diff}/10 higher mood.", { diff: jm.diff.toFixed(1) }),
      weight: 50 + jm.diff * 4,
    });
  }

  // Which build habit's done-days lift the Life Score most (biggest lever).
  let bestLever: { name: string; diff: number } | null = null;
  for (const h of data.habits.filter((x) => x.kind === "build" && !x.archived)) {
    const done = new Set(data.habitLogs.filter((l) => l.habitId === h.id && l.done).map((l) => l.date));
    const eff = assoc((d) => done.has(d), life, scoreDates);
    if (eff && eff.diff > (bestLever?.diff ?? 4)) bestLever = { name: h.name, diff: eff.diff };
  }
  if (bestLever) {
    F.push({
      id: "best-lever",
      kind: "tip",
      title: t("Your biggest lever"),
      detail: t("Days you do “{name}” average {diff} Life-Score points higher than days you don't — protect this one.", {
        name: bestLever.name,
        diff: Math.round(bestLever.diff),
      }),
      weight: 80 + bestLever.diff,
    });
  }

  // ---------- Per-area strengths & momentum ----------
  const areas: AreaKey[] = ["productivity", "sport", "sleep", "habits", "learning", "creativity", "reflection", "finances"];
  const recent = withData.slice(-14);
  const areaAvg = (a: AreaKey, days: DayScore[]) => {
    const xs = days.map((d) => d.categories[a]).filter((v): v is number => v != null);
    return xs.length >= 4 ? mean(xs) : null;
  };
  // strongest area
  const ranked = areas
    .map((a) => ({ a, m: areaAvg(a, recent) }))
    .filter((x): x is { a: AreaKey; m: number } => x.m != null)
    .sort((x, y) => y.m - x.m);
  if (ranked.length) {
    const top = ranked[0];
    if (top.m >= 65) {
      F.push({
        id: "top-area",
        kind: "strength",
        title: t("Strongest area"),
        detail: t("{area} is your strongest area lately, averaging {m}/100.", { area: area(top.a), m: Math.round(top.m) }),
        weight: 45 + (top.m - 65),
      });
    }
    const bottom = ranked[ranked.length - 1];
    if (ranked.length >= 3 && bottom.m < 45) {
      F.push({
        id: "weak-area",
        kind: "watch",
        title: t("Area to lift"),
        detail: t("{area} is trailing at {m}/100 — a small, specific habit here would move your overall score most.", { area: area(bottom.a), m: Math.round(bottom.m) }),
        weight: 55 + (45 - bottom.m),
      });
    }
  }
  // area momentum (7d vs prior 7d)
  if (withData.length >= 14) {
    const last7 = withData.slice(-7);
    const prev7 = withData.slice(-14, -7);
    for (const a of areas) {
      const now = areaAvg(a, last7);
      const before = areaAvg(a, prev7);
      if (now == null || before == null) continue;
      const d = Math.round(now - before);
      if (d >= 8) {
        F.push({ id: `mom-up-${a}`, kind: "strength", title: t("{area} is climbing", { area: area(a) }), detail: t("{area} is up {d} points versus the previous week.", { area: area(a), d }), weight: 40 + d });
      } else if (d <= -8) {
        F.push({ id: `mom-dn-${a}`, kind: "watch", title: t("{area} is slipping", { area: area(a) }), detail: t("{area} dropped {d} points versus the previous week.", { area: area(a), d: Math.abs(d) }), weight: 45 + Math.abs(d) });
      }
    }
  }

  // ---------- Habit adherence ----------
  for (const h of data.habits.filter((x) => x.kind === "build" && !x.archived)) {
    const logs = data.habitLogs.filter((l) => l.habitId === h.id);
    const recentLogs = logs.filter((l) => l.date >= (withData[Math.max(0, withData.length - 21)]?.date ?? ""));
    if (recentLogs.length < 6) continue;
    const rate = recentLogs.filter((l) => l.done).length / recentLogs.length;
    if (rate < 0.4) {
      F.push({
        id: `adh-${h.id}`,
        kind: "tip",
        title: t("Low adherence"),
        detail: t("“{name}” is only at {pct}% lately. Either shrink the goal so it's easy to win, or schedule a fixed time for it.", { name: h.name, pct: Math.round(rate * 100) }),
        weight: 50 + (40 - rate * 100),
      });
    }
  }

  // ---------- Sleep debt & regularity ----------
  const durations = data.sleep.slice(-21).map((s) => sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0));
  if (durations.length >= MIN) {
    const avg = mean(durations);
    const debt = target - avg;
    if (debt >= 20) {
      F.push({
        id: "sleep-debt",
        kind: "tip",
        title: t("Sleep is short"),
        detail: t("You're averaging {avg} vs your {target} target — about {debt} min short a night. Going to bed {debt} min earlier is the easiest fix.", {
          avg: fmtH(avg),
          target: fmtH(target),
          debt: Math.round(debt),
        }),
        weight: 62 + debt / 5,
      });
    }
    const beds = data.sleep.slice(-21).map((s) => bedMin(s.bedTime));
    const sd = stdev(beds);
    if (beds.length >= MIN && sd > 60) {
      F.push({
        id: "sleep-irregular",
        kind: "watch",
        title: t("Irregular bedtime"),
        detail: t("Your bedtime swings by ±{sd} min. A more regular schedule usually improves sleep quality more than total hours.", { sd: Math.round(sd) }),
        weight: 48 + sd / 10,
      });
    }
  }

  // ---------- Weekday patterns ----------
  const byWd: number[][] = Array.from({ length: 7 }, () => []);
  for (const h of withData) byWd[weekdayOf(h.date)].push(h.lifeScore);
  const wdMeans = byWd.map((xs, i) => ({ i, m: xs.length >= 3 ? mean(xs) : -1 })).filter((x) => x.m >= 0);
  if (wdMeans.length >= 4) {
    const best = [...wdMeans].sort((a, b) => b.m - a.m)[0];
    const worst = [...wdMeans].sort((a, b) => a.m - b.m)[0];
    if (best.m - worst.m >= 8) {
      F.push({
        id: "weekday",
        kind: "insight",
        title: t("Weekday rhythm"),
        detail: t("{best} are your strongest days and {worst} your weakest ({gap} points apart). Plan demanding things for {best}.", {
          best: wd(best.i),
          worst: wd(worst.i),
          gap: Math.round(best.m - worst.m),
        }),
        weight: 42 + (best.m - worst.m),
      });
    }
  }

  // ---------- Streak / consistency ----------
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].lifeScore > 0) streak++;
    else break;
  }
  if (streak >= 5) {
    F.push({
      id: "streak",
      kind: "strength",
      title: t("Consistent logging"),
      detail: t("You've logged {n} days in a row — consistency is what makes all of this analysis sharper.", { n: streak }),
      weight: 35 + streak,
    });
  }

  // ---------- Verdict ----------
  const last7 = mean(withData.slice(-7).map((x) => x.lifeScore));
  const prev7 = mean(withData.slice(-14, -7).map((x) => x.lifeScore));
  const score = Math.round(last7);
  const trend = withData.length >= 14 ? Math.round(last7 - prev7) : 0;
  const label = score >= 80 ? t("Excellent") : score >= 65 ? t("Strong") : score >= 50 ? t("Steady") : score > 0 ? t("Building") : t("No data yet");

  const topStrength = [...F].filter((f) => f.kind === "strength" || f.kind === "insight").sort((a, b) => b.weight - a.weight)[0];
  const topWatch = [...F].filter((f) => f.kind === "watch" || f.kind === "tip").sort((a, b) => b.weight - a.weight)[0];
  let summary: string;
  if (score === 0) {
    summary = t("Log a week or two of days and this analysis fills in with cross-connections and suggestions.");
  } else {
    const trendPart =
      trend >= 3 ? t("trending up") : trend <= -3 ? t("trending down") : t("holding steady");
    summary = t("Your 7-day score is {score} ({trend}).", { score, trend: trendPart });
    if (topStrength) summary += " " + t("Working for you: {s}", { s: topStrength.title.replace(/ ↔ /g, "/") });
    if (topWatch) summary += " " + t("Focus next: {w}", { w: topWatch.title });
  }

  F.sort((a, b) => b.weight - a.weight);
  return { verdict: { score, trend, label, summary }, findings: F };
}

function fmtH(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
