import { AppData, AreaKey, DayScore, Language } from "./types";
import { AREA_LABELS } from "./defaults";
import { sleepDurationMinutes, weekdayLabel, weekdayOf, addDays } from "./date";
import { translate } from "./i18n";

/*
  "Analog" analysis engine — no AI. It pools everything the user logs (sleep, training,
  habits, reviews, journal, per-area scores) and cross-analyses it into a structured report:
  what's going well, what to watch, cross-category correlations, and concrete suggestions.

  Grounded in the user's OWN data, phrased as association, never medical/causal. Each
  generator needs a minimum sample + effect size. Disabled life areas are excluded
  everywhere: per-area scores already omit them, and raw-data generators gate on the area.
*/

export type FindingKind = "strength" | "watch" | "insight" | "tip";

export interface Finding {
  id: string;
  kind: FindingKind;
  title: string;
  detail: string;
  weight: number;
}

export interface AnalysisReport {
  verdict: { score: number; trend: number; label: string; summary: string };
  findings: Finding[];
}

const MIN = 5; // min per group for a two-group comparison
const CORR_MIN = 8; // min paired points for a correlation

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
function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < CORR_MIN) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

const ALL_AREAS: AreaKey[] = ["productivity", "sport", "sleep", "habits", "learning", "creativity", "reflection", "finances"];

export function analyze(data: AppData, history: DayScore[], lang: Language = "en"): AnalysisReport {
  const t = (k: string, v?: Record<string, string | number>) => translate(lang, k, v);
  const wd = (n: number) => translate(lang, weekdayLabel(n, true));
  const area = (a: AreaKey) => translate(lang, AREA_LABELS[a]);
  const F: Finding[] = [];

  const enabled = new Set(data.settings.areas.filter((a) => a.enabled).map((a) => a.key));
  const has = (a: AreaKey) => enabled.has(a);
  // Review ratings (productivity/mood/energy) come from the daily check-in = reflection area.
  const refl = has("reflection");

  const withData = history.filter((h) => h.lifeScore > 0);
  const byDate = new Map(history.map((h) => [h.date, h]));
  const reviewOf = new Map(data.reviews.map((r) => [r.date, r]));

  const sportHabits = new Set(data.habits.filter((h) => h.area === "sport" && h.kind === "build").map((h) => h.id));
  const trained = new Set<string>(data.workouts.map((w) => w.date));
  for (const l of data.habitLogs) if (l.done && sportHabits.has(l.habitId)) trained.add(l.date);
  const journaled = new Set(data.journal.map((j) => j.date));
  const reduceIds = new Set(data.habits.filter((h) => h.kind === "reduce").map((h) => h.id));
  const slipDates = new Set(data.habitLogs.filter((l) => l.done && reduceIds.has(l.habitId)).map((l) => l.date));
  const target = data.settings.sleepTargetMinutes;

  const sleepOf = new Map(data.sleep.map((s) => [s.date, s]));
  const prod = (d: string) => reviewOf.get(d)?.productivity ?? null;
  const mood = (d: string) => reviewOf.get(d)?.mood ?? null;
  const energy = (d: string) => reviewOf.get(d)?.energy ?? null;
  const life = (d: string) => byDate.get(d)?.lifeScore ?? null;
  const sleepDur = (d: string) => {
    const s = sleepOf.get(d);
    return s ? sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0) : null;
  };
  const sleptEnough = (d: string) => {
    const dur = sleepDur(d);
    return dur == null ? false : dur >= target;
  };

  function assoc(pred: (d: string) => boolean, metric: (d: string) => number | null, dates: string[]) {
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
  const sleepDates = data.sleep.map((s) => s.date);
  const scoreDates = withData.map((h) => h.date);

  // ---------- Sleep correlations ----------
  if (has("sleep") && refl) {
    const sp = assoc(sleptEnough, prod, reviewDates.filter((d) => sleepOf.has(d)));
    if (sp && Math.abs(sp.diff) >= 0.5) {
      F.push({
        id: "sleep-prod",
        kind: "insight",
        title: t("Sleep ↔ productivity"),
        detail:
          sp.diff > 0
            ? t("On nights you hit your sleep target, your rated productivity is about {pct}% higher.", { pct: sp.pct })
            : t("More sleep isn't lifting your productivity in this window — the link is weak so far."),
        weight: 62 + Math.min(30, sp.pct),
      });
    }
    const sm = assoc(sleptEnough, mood, reviewDates.filter((d) => sleepOf.has(d)));
    if (sm && sm.diff >= 0.5) {
      F.push({ id: "sleep-mood", kind: "insight", title: t("Sleep ↔ mood"), detail: t("Your mood averages {diff} points higher (out of 10) after hitting your sleep target.", { diff: sm.diff.toFixed(1) }), weight: 56 + sm.diff * 5 });
    }
    // Lagged: last night's sleep → NEXT day
    const spNext = assoc(sleptEnough, (d) => prod(addDays(d, 1)), sleepDates);
    if (spNext && spNext.diff >= 0.6) {
      F.push({ id: "sleep-prod-next", kind: "insight", title: t("Sleep → next day"), detail: t("After a night hitting your sleep target, the next day's productivity runs about {pct}% higher.", { pct: spNext.pct }), weight: 60 + Math.min(28, spNext.pct) });
    }
    // Sleep quality → energy
    const sq = assoc((d) => (sleepOf.get(d)?.quality ?? 0) >= 7, energy, reviewDates.filter((d) => sleepOf.has(d)));
    if (sq && sq.diff >= 0.5) {
      F.push({ id: "sleepq-energy", kind: "insight", title: t("Sleep quality ↔ energy"), detail: t("On nights you rate sleep 7+/10, your energy the next morning is {diff}/10 higher.", { diff: sq.diff.toFixed(1) }), weight: 52 + sq.diff * 5 });
    }
    // Morning energy → life score
    const me = assoc((d) => (sleepOf.get(d)?.morningEnergy ?? 0) >= 7, life, scoreDates.filter((d) => sleepOf.has(d)));
    if (me && me.diff >= 3) {
      F.push({ id: "morninge-life", kind: "insight", title: t("Morning energy ↔ day"), detail: t("Days you wake up with 7+/10 energy end with a Life Score about {diff} points higher.", { diff: Math.round(me.diff) }), weight: 54 + me.diff });
    }
  }

  // ---------- Training correlations ----------
  if (has("sport")) {
    const tl = assoc((d) => trained.has(d), life, scoreDates);
    if (tl && tl.diff >= 3) {
      F.push({ id: "train-life", kind: "insight", title: t("Training ↔ Life Score"), detail: t("On days you train, your Life Score is on average {diff} points higher.", { diff: Math.round(tl.diff) }), weight: 72 + tl.diff });
    }
    if (refl) {
      const tm = assoc((d) => trained.has(d), mood, reviewDates);
      if (tm && tm.diff >= 0.5) {
        F.push({ id: "train-mood", kind: "insight", title: t("Training ↔ mood"), detail: t("Your mood runs {diff}/10 higher on training days.", { diff: tm.diff.toFixed(1) }), weight: 58 + tm.diff * 5 });
      }
      const teNext = assoc((d) => trained.has(d), (d) => energy(addDays(d, 1)), [...trained]);
      if (teNext && teNext.diff >= 0.5) {
        F.push({ id: "train-energy-next", kind: "insight", title: t("Training → next-day energy"), detail: t("The day after you train, your energy is {diff}/10 higher.", { diff: teNext.diff.toFixed(1) }), weight: 50 + teNext.diff * 5 });
      }
    }
  }

  // ---------- Journaling ----------
  if (refl) {
    const jm = assoc((d) => journaled.has(d), mood, reviewDates);
    if (jm && jm.diff >= 0.5) {
      F.push({ id: "journal-mood", kind: "insight", title: t("Journaling ↔ mood"), detail: t("Days you journal tend to come with a {diff}/10 higher mood.", { diff: jm.diff.toFixed(1) }), weight: 48 + jm.diff * 4 });
    }
  }

  // ---------- Reduce-habit slips ----------
  if (has("habits") && refl) {
    const slipMood = assoc((d) => slipDates.has(d), mood, reviewDates);
    if (slipMood && slipMood.diff <= -0.5) {
      F.push({ id: "slip-mood", kind: "watch", title: t("Slip days ↔ mood"), detail: t("On days you slip on a reduce-habit, your mood is about {diff}/10 lower.", { diff: Math.abs(slipMood.diff).toFixed(1) }), weight: 60 + Math.abs(slipMood.diff) * 5 });
    }
  }

  // ---------- Multi-factor interaction (sleep + training) ----------
  if (has("sleep") && has("sport")) {
    const both: number[] = [];
    const neither: number[] = [];
    for (const d of scoreDates) {
      const v = life(d);
      if (v == null) continue;
      const s = sleptEnough(d);
      const tr = trained.has(d);
      if (s && tr) both.push(v);
      else if (!s && !tr) neither.push(v);
    }
    if (both.length >= MIN && neither.length >= MIN) {
      const diff = Math.round(mean(both) - mean(neither));
      if (diff >= 5) {
        F.push({ id: "combo", kind: "tip", title: t("Your winning combo"), detail: t("Days with both enough sleep and a workout beat days with neither by {diff} Life-Score points. Stacking these two is your strongest routine.", { diff }), weight: 82 + diff });
      }
    }
  }

  // ---------- Weekend vs weekday ----------
  {
    const we: number[] = [];
    const wk: number[] = [];
    for (const h of withData) (weekdayOf(h.date) === 0 || weekdayOf(h.date) === 6 ? we : wk).push(h.lifeScore);
    if (we.length >= MIN && wk.length >= MIN) {
      const diff = Math.round(mean(we) - mean(wk));
      if (Math.abs(diff) >= 5) {
        F.push({
          id: "weekend",
          kind: "insight",
          title: t("Weekend vs weekday"),
          detail:
            diff > 0
              ? t("Your weekends score {diff} points higher than weekdays — the structure of your days off is working.", { diff })
              : t("Your weekends score {diff} points lower than weekdays — they might need a little more structure.", { diff: Math.abs(diff) }),
          weight: 44 + Math.abs(diff),
        });
      }
    }
  }

  // ---------- Cross-area correlations (network every enabled area pair) ----------
  const enabledAreas = ALL_AREAS.filter((a) => has(a));
  const series = new Map<AreaKey, Map<string, number>>();
  for (const a of enabledAreas) {
    const m = new Map<string, number>();
    for (const h of history) {
      const v = h.categories[a];
      if (v != null) m.set(h.date, v);
    }
    if (m.size >= CORR_MIN) series.set(a, m);
  }
  const seriesAreas = [...series.keys()];
  const corrs: { a: AreaKey; b: AreaKey; r: number }[] = [];
  for (let i = 0; i < seriesAreas.length; i++) {
    for (let j = i + 1; j < seriesAreas.length; j++) {
      const A = series.get(seriesAreas[i])!;
      const B = series.get(seriesAreas[j])!;
      const xs: number[] = [];
      const ys: number[] = [];
      for (const [d, v] of A) {
        const w = B.get(d);
        if (w != null) {
          xs.push(v);
          ys.push(w);
        }
      }
      const r = pearson(xs, ys);
      if (r != null && Math.abs(r) >= 0.4) corrs.push({ a: seriesAreas[i], b: seriesAreas[j], r });
    }
  }
  corrs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  for (const c of corrs.slice(0, 3)) {
    const strength = Math.abs(c.r) >= 0.6 ? t("strong") : t("moderate");
    F.push({
      id: `corr-${c.a}-${c.b}`,
      kind: "insight",
      title: `${area(c.a)} ↔ ${area(c.b)}`,
      detail:
        c.r > 0
          ? t("{a} and {b} rise and fall together in your data ({strength} link) — lifting one tends to lift the other.", { a: area(c.a), b: area(c.b), strength })
          : t("When your {a} is high, your {b} tends to be lower ({strength} link) — worth watching the trade-off.", { a: area(c.a), b: area(c.b), strength }),
      weight: 46 + Math.round(Math.abs(c.r) * 40),
    });
  }

  // ---------- Habit levers ----------
  let bestLever: { name: string; diff: number } | null = null;
  let worstMiss: { name: string; diff: number } | null = null;
  for (const h of data.habits.filter((x) => x.kind === "build" && !x.archived && has(x.area))) {
    const done = new Set(data.habitLogs.filter((l) => l.habitId === h.id && l.done).map((l) => l.date));
    const eff = assoc((d) => done.has(d), life, scoreDates);
    if (!eff) continue;
    if (eff.diff > (bestLever?.diff ?? 4)) bestLever = { name: h.name, diff: eff.diff };
    if (eff.diff > (worstMiss?.diff ?? 6)) worstMiss = { name: h.name, diff: eff.diff };
  }
  if (bestLever) {
    F.push({ id: "best-lever", kind: "tip", title: t("Your biggest lever"), detail: t("Days you do “{name}” average {diff} Life-Score points higher than days you don't — protect this one.", { name: bestLever.name, diff: Math.round(bestLever.diff) }), weight: 84 + bestLever.diff });
  }

  // Which reduce-habit hurts most (mood)
  if (refl) {
    let worstSlip: { name: string; diff: number } | null = null;
    for (const h of data.habits.filter((x) => x.kind === "reduce" && !x.archived && has(x.area))) {
      const slip = new Set(data.habitLogs.filter((l) => l.habitId === h.id && l.done).map((l) => l.date));
      const eff = assoc((d) => slip.has(d), mood, reviewDates);
      if (eff && eff.diff <= -0.6 && (!worstSlip || eff.diff < -worstSlip.diff)) worstSlip = { name: h.name, diff: Math.abs(eff.diff) };
    }
    if (worstSlip) {
      F.push({ id: "worst-slip", kind: "tip", title: t("Costliest habit"), detail: t("“{name}” days come with a {diff}/10 mood drop — the reduce-habit worth tackling first.", { name: worstSlip.name, diff: worstSlip.diff.toFixed(1) }), weight: 66 + worstSlip.diff * 5 });
    }
  }

  // Low adherence
  const cutoff = withData[Math.max(0, withData.length - 21)]?.date ?? "";
  for (const h of data.habits.filter((x) => x.kind === "build" && !x.archived && has(x.area))) {
    const recentLogs = data.habitLogs.filter((l) => l.habitId === h.id && l.date >= cutoff);
    if (recentLogs.length < 6) continue;
    const rate = recentLogs.filter((l) => l.done).length / recentLogs.length;
    if (rate < 0.4) {
      F.push({ id: `adh-${h.id}`, kind: "tip", title: t("Low adherence"), detail: t("“{name}” is only at {pct}% lately. Either shrink the goal so it's easy to win, or schedule a fixed time for it.", { name: h.name, pct: Math.round(rate * 100) }), weight: 50 + (40 - rate * 100) });
    }
  }

  // ---------- "Best-days mix": what your top days have in common ----------
  if (withData.length >= 12) {
    const sorted = [...withData].sort((a, b) => b.lifeScore - a.lifeScore);
    const topN = Math.max(4, Math.round(withData.length * 0.25));
    const top = new Set(sorted.slice(0, topN).map((h) => h.date));
    const factors: { area: AreaKey; label: string; pred: (d: string) => boolean }[] = [
      { area: "sport", label: t("trained"), pred: (d) => trained.has(d) },
      { area: "sleep", label: t("slept enough"), pred: sleptEnough },
      { area: "reflection", label: t("journaled"), pred: (d) => journaled.has(d) },
    ];
    let bestFactor: { label: string; top: number; base: number } | null = null;
    for (const f of factors) {
      if (!has(f.area)) continue;
      const topRate = mean([...top].map((d) => (f.pred(d) ? 1 : 0)));
      const baseRate = mean(scoreDates.map((d) => (f.pred(d) ? 1 : 0)));
      if (topRate >= 0.5 && topRate - baseRate >= 0.2 && (!bestFactor || topRate - baseRate > bestFactor.top - bestFactor.base)) {
        bestFactor = { label: f.label, top: topRate, base: baseRate };
      }
    }
    if (bestFactor) {
      F.push({ id: "top-mix", kind: "tip", title: t("What your best days share"), detail: t("On your top days you {label} {top}% of the time — versus {base}% overall. That's your highest-leverage routine.", { label: bestFactor.label, top: Math.round(bestFactor.top * 100), base: Math.round(bestFactor.base * 100) }), weight: 74 });
    }
  }

  // ---------- Per-area strengths & momentum ----------
  const recent = withData.slice(-14);
  const areaAvg = (a: AreaKey, days: DayScore[]) => {
    const xs = days.map((d) => d.categories[a]).filter((v): v is number => v != null);
    return xs.length >= 4 ? mean(xs) : null;
  };
  const ranked = enabledAreas
    .map((a) => ({ a, m: areaAvg(a, recent) }))
    .filter((x): x is { a: AreaKey; m: number } => x.m != null)
    .sort((x, y) => y.m - x.m);
  if (ranked.length) {
    const top = ranked[0];
    if (top.m >= 65) F.push({ id: "top-area", kind: "strength", title: t("Strongest area"), detail: t("{area} is your strongest area lately, averaging {m}/100.", { area: area(top.a), m: Math.round(top.m) }), weight: 45 + (top.m - 65) });
    const bottom = ranked[ranked.length - 1];
    if (ranked.length >= 3 && bottom.m < 45) F.push({ id: "weak-area", kind: "watch", title: t("Area to lift"), detail: t("{area} is trailing at {m}/100 — a small, specific habit here would move your overall score most.", { area: area(bottom.a), m: Math.round(bottom.m) }), weight: 55 + (45 - bottom.m) });
  }
  if (withData.length >= 14) {
    const last7 = withData.slice(-7);
    const prev7 = withData.slice(-14, -7);
    for (const a of enabledAreas) {
      const now = areaAvg(a, last7);
      const before = areaAvg(a, prev7);
      if (now == null || before == null) continue;
      const dd = Math.round(now - before);
      if (dd >= 8) F.push({ id: `mom-up-${a}`, kind: "strength", title: t("{area} is climbing", { area: area(a) }), detail: t("{area} is up {d} points versus the previous week.", { area: area(a), d: dd }), weight: 40 + dd });
      else if (dd <= -8) F.push({ id: `mom-dn-${a}`, kind: "watch", title: t("{area} is slipping", { area: area(a) }), detail: t("{area} dropped {d} points versus the previous week.", { area: area(a), d: Math.abs(dd) }), weight: 45 + Math.abs(dd) });
    }
  }

  // ---------- Sleep debt & regularity ----------
  if (has("sleep")) {
    const durations = data.sleep.slice(-21).map((s) => sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0));
    if (durations.length >= MIN) {
      const avg = mean(durations);
      const debt = target - avg;
      if (debt >= 20) F.push({ id: "sleep-debt", kind: "tip", title: t("Sleep is short"), detail: t("You're averaging {avg} vs your {target} target — about {debt} min short a night. Going to bed {debt} min earlier is the easiest fix.", { avg: fmtH(avg), target: fmtH(target), debt: Math.round(debt) }), weight: 62 + debt / 5 });
      const beds = data.sleep.slice(-21).map((s) => bedMin(s.bedTime));
      const sd = stdev(beds);
      if (beds.length >= MIN && sd > 60) F.push({ id: "sleep-irregular", kind: "watch", title: t("Irregular bedtime"), detail: t("Your bedtime swings by ±{sd} min. A more regular schedule usually improves sleep quality more than total hours.", { sd: Math.round(sd) }), weight: 48 + sd / 10 });
    }
  }

  // ---------- Weekday rhythm ----------
  const byWd: number[][] = Array.from({ length: 7 }, () => []);
  for (const h of withData) byWd[weekdayOf(h.date)].push(h.lifeScore);
  const wdMeans = byWd.map((xs, i) => ({ i, m: xs.length >= 3 ? mean(xs) : -1 })).filter((x) => x.m >= 0);
  if (wdMeans.length >= 4) {
    const best = [...wdMeans].sort((a, b) => b.m - a.m)[0];
    const worst = [...wdMeans].sort((a, b) => a.m - b.m)[0];
    if (best.m - worst.m >= 8) F.push({ id: "weekday", kind: "insight", title: t("Weekday rhythm"), detail: t("{best} are your strongest days and {worst} your weakest ({gap} points apart). Plan demanding things for {best}.", { best: wd(best.i), worst: wd(worst.i), gap: Math.round(best.m - worst.m) }), weight: 42 + (best.m - worst.m) });
  }

  // ---------- Reduce-habit weekday concentration ----------
  if (has("habits")) {
    const slipByWd = Array.from({ length: 7 }, () => 0);
    const daysByWd = Array.from({ length: 7 }, () => 0);
    const seen = new Set<string>();
    for (const l of data.habitLogs) {
      if (!reduceIds.has(l.habitId)) continue;
      if (!seen.has(l.date)) {
        seen.add(l.date);
        daysByWd[weekdayOf(l.date)] += 1;
      }
      if (l.done) slipByWd[weekdayOf(l.date)] += 1;
    }
    const rate = slipByWd.map((s, i) => (daysByWd[i] > 0 ? s / daysByWd[i] : 0));
    const overall = mean(rate.filter((_, i) => daysByWd[i] > 0));
    let worst = -1;
    let worstRate = 0;
    rate.forEach((r, i) => {
      if (daysByWd[i] >= 3 && r > worstRate) {
        worstRate = r;
        worst = i;
      }
    });
    if (worst >= 0 && overall > 0 && worstRate > overall * 1.3) {
      F.push({ id: "slip-weekday", kind: "watch", title: t("A weak weekday"), detail: t("{day}s show your reduce-habits about {pct}% above your average — plan a countermeasure for that day.", { day: wd(worst), pct: Math.round(((worstRate - overall) / overall) * 100) }), weight: 47 });
    }
  }

  // ---------- Streak ----------
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].lifeScore > 0) streak++;
    else break;
  }
  if (streak >= 5) F.push({ id: "streak", kind: "strength", title: t("Consistent logging"), detail: t("You've logged {n} days in a row — consistency is what makes all of this analysis sharper.", { n: streak }), weight: 35 + streak });

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
    const trendPart = trend >= 3 ? t("trending up") : trend <= -3 ? t("trending down") : t("holding steady");
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
