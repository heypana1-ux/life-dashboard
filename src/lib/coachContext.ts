import { AppData, DayScore, Language } from "./types";
import { analyze } from "./analysis";
import { habitsForToday } from "./habitView";
import { aboutSummary } from "./about";
import { personalRecords } from "./trainingStats";
import { analyzeCycle } from "./cycle";
import { SYMPTOM_LABEL, Symptom } from "./health";
import { computeLevel } from "./level";
import { weeklyChallenges } from "./challenges";
import { computeAchievements } from "./achievements";
import { evaluateExperiment } from "./experiments";
import { detectAnomalies } from "./anomalies";
import { WHEEL_DIMS, latestWheel, wheelAverage } from "./wheel";
import { dataWheelScores } from "./dataWheel";
import { weekdayFeelings } from "./weekdayStats";
import { siteLabel } from "./bodySites";
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

  // Goals
  const goals = data.goals.filter((g) => !g.archived);
  if (goals.length) {
    const gl = goals.slice(0, 6).map((g) => `${g.title} (${g.progress}%${g.deadline ? `, due ${g.deadline}` : ""})`);
    L.push(`Active goals: ${gl.join("; ")}.`);
  }

  // Strength records
  if (data.workouts.length) {
    const prs = personalRecords(data.workouts).slice(0, 5).map((p) => `${p.name} ${p.weight}kg×${p.reps} (~1RM ${p.best1RM})`);
    if (prs.length) L.push(`Strength records: ${prs.join("; ")}.`);
    // Recent training sessions (most recent first) so the coach can tailor the next one.
    const recentW = [...data.workouts].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
    const lines = recentW.map((w) => {
      const bits = [w.sport, `${w.durationMin}min`];
      if (w.distanceKm) bits.push(`${w.distanceKm}km`);
      if (w.rounds) bits.push(`${w.rounds} rounds`);
      if (w.exercises.length) bits.push(`${w.exercises.length} exercises`);
      if (w.performance) bits.push(`felt ${w.performance}/10`);
      return `${w.date}: ${bits.join(", ")}`;
    });
    if (lines.length) L.push("Recent training sessions:\n" + lines.map((l) => `- ${l}`).join("\n"));
  }

  // Health details (symptoms, sick/recovery, meds, cycle)
  if (data.health.length) {
    const recent = data.health.filter((h) => h.date >= addDays(today, -14));
    const symFreq = new Map<string, number>();
    let sickDays = 0;
    let recovDays = 0;
    for (const h of recent) {
      if (h.sick) sickDays += 1;
      if (h.recovering) recovDays += 1;
      for (const [k, v] of Object.entries(h.symptoms ?? {})) if (v > 0) symFreq.set(k, (symFreq.get(k) ?? 0) + 1);
    }
    const hp: string[] = [];
    if (symFreq.size) {
      const top = [...symFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${SYMPTOM_LABEL[k as Symptom] ?? k} ${n}×`);
      hp.push(`symptoms (14d): ${top.join(", ")}`);
    }
    if (sickDays) hp.push(`${sickDays} sick day(s)`);
    if (recovDays) hp.push(`${recovDays} recovery day(s)`);
    if (hp.length) L.push(`Health: ${hp.join("; ")}.`);
    const meds = data.settings.medications ?? [];
    if (meds.length) {
      const takenDays = recent.filter((h) => (h.meds?.length ?? 0) > 0).length;
      L.push(`Medications/supplements tracked: ${meds.join(", ")}; taken on ${takenDays} of the last ${recent.length} logged days.`);
    }
    if (data.settings.cycleTracking) {
      const c = analyzeCycle(data.health, today);
      if (c.lastStart) L.push(`Cycle: day ${c.cycleDay ?? "?"}${c.avgLength ? `, avg length ${c.avgLength}d` : ""}${c.nextPredicted ? `, next around ${c.nextPredicted}` : ""}.`);
    }
  }

  // Journal — mood & tags always; full entries only if the user opted in.
  if (data.journal.length) {
    const rj = data.journal.filter((j) => j.date >= addDays(today, -30));
    if (rj.length) {
      const moods = rj.map((j) => j.mood).filter((m): m is number => typeof m === "number");
      const tagFreq = new Map<string, number>();
      for (const j of rj) for (const tg of j.tags ?? []) tagFreq.set(tg, (tagFreq.get(tg) ?? 0) + 1);
      const jp = [`${rj.length} entries in 30 days`];
      if (moods.length) jp.push(`avg mood ${(moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)}/10`);
      if (tagFreq.size) jp.push(`common tags: ${[...tagFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k).join(", ")}`);
      L.push(`Journal: ${jp.join("; ")}${data.settings.aiJournalAccess ? "" : " (written contents kept private)"}.`);

      if (data.settings.aiJournalAccess) {
        const entries = [...rj].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12);
        const lines = entries.map((j) => {
          const parts = [j.date];
          if (j.mood != null) parts.push(`mood ${j.mood}/10`);
          if (j.title) parts.push(`"${j.title}"`);
          const body = (j.body ?? "").replace(/\s+/g, " ").trim().slice(0, 400);
          if (body) parts.push(body);
          if (j.highlight) parts.push(`highlight: ${j.highlight}`);
          if (j.tags?.length) parts.push(`[${j.tags.join(", ")}]`);
          return `- ${parts.join(" — ")}`;
        });
        L.push("Recent journal entries (shared with your permission):\n" + lines.join("\n"));
      }
    }
  }

  // Projects & experiments
  if (data.projects.length) L.push(`Tracking ${data.projects.length} project(s) on the board.`);
  for (const e of data.experiments.slice(0, 3)) {
    const res = evaluateExperiment(data, e);
    if (res.enough) {
      L.push(`Experiment "${e.title}": on days meeting the condition, the target metric was ${res.diffPct >= 0 ? "+" : ""}${res.diffPct}% vs other days (n=${res.nMet} vs ${res.nNot}).`);
    }
  }

  // Level, achievements, weekly challenges
  const lvl = computeLevel(data, history);
  const unlocked = computeAchievements(data, history).filter((a) => a.unlocked).length;
  L.push(`Progress: Level ${lvl.level} (${lvl.title}), ${lvl.xp} total XP; ${unlocked} achievements unlocked.`);
  const ch = weeklyChallenges(data, byDate, today);
  const openCh = ch.filter((c) => !c.done);
  L.push(line([`This week's challenges: ${ch.length - openCh.length}/${ch.length} done.`, openCh.length ? `Still open: ${openCh.map((c) => c.title).join(", ")}.` : ""]));

  // Reduce-habit slips: self-reported triggers and weekend timing (last 60 days)
  const reduceIds = new Set(data.habits.filter((h) => h.kind === "reduce").map((h) => h.id));
  if (reduceIds.size) {
    const since = addDays(today, -60);
    const slips = data.habitLogs.filter((l) => reduceIds.has(l.habitId) && l.done && l.date >= since);
    if (slips.length) {
      const trig = new Map<string, number>();
      let weekend = 0;
      for (const s of slips) {
        if (s.trigger) trig.set(s.trigger, (trig.get(s.trigger) ?? 0) + 1);
        const wd = weekdayOf(s.date);
        if (wd === 0 || wd === 6) weekend += 1;
      }
      const parts = [`${slips.length} slips in 60 days`];
      if (trig.size) parts.push(`common triggers: ${[...trig.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} ${n}x`).join(", ")}`);
      parts.push(`${Math.round((weekend / slips.length) * 100)}% on weekends`);
      L.push(`Watch-list slips: ${parts.join("; ")}.`);
    }
  }

  // Recent anomalies (last 7 days vs the prior 3 weeks)
  const anomalies = detectAnomalies(data, history);
  if (anomalies.length) {
    L.push(
      "Recent anomalies (7d vs prior 3 weeks): " +
        anomalies.map((a) => `${a.metric} ${a.dir === "up" ? "up" : "down"} ${a.pct}% (now ${a.recent} vs usual ${a.usual})`).join("; ") +
        ".",
    );
  }

  // Body measurements (latest girths) & weight
  if (data.measurements.length) {
    const bySite = new Map<string, { date: string; cm: number }>();
    for (const m of data.measurements) {
      const cur = bySite.get(m.site);
      if (!cur || m.date > cur.date) bySite.set(m.site, { date: m.date, cm: m.cm });
    }
    const parts = [...bySite.entries()].map(([site, v]) => `${siteLabel(site)} ${v.cm}cm`);
    if (parts.length) L.push(`Latest body measurements: ${parts.join(", ")}.`);
  }
  const latestWeight = [...data.weight].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (latestWeight) L.push(`Latest weight: ${latestWeight.kg}kg (${latestWeight.date}).`);

  // Wheel of Life (self-assessment of life balance)
  const wheel = latestWheel(data.wheelChecks);
  if (wheel) {
    const dims = WHEEL_DIMS.map((dm) => `${dm.label} ${wheel.scores[dm.key] ?? "?"}`).join(", ");
    L.push(`Wheel of Life — feeling (self-rated 1-10, ${wheel.date}): avg ${wheelAverage(wheel.scores).toFixed(1)} — ${dims}.`);
  }
  const dataWheel = dataWheelScores(data, history);
  const dwKeys = Object.keys(dataWheel);
  if (dwKeys.length) {
    const parts = WHEEL_DIMS.filter((dm) => dataWheel[dm.key] != null).map((dm) => {
      const dv = dataWheel[dm.key];
      const fv = wheel?.scores[dm.key];
      return `${dm.label} ${dv}${fv != null ? ` (feels ${fv})` : ""}`;
    });
    L.push(`Wheel of Life — data-driven (1-10 from last 30d): ${parts.join(", ")}.`);
  }

  // How the user feels by weekday (from check-ins) — surfaces "Mondays drain you" patterns.
  const wf = weekdayFeelings(data.reviews);
  if (wf.enough) {
    const order = [1, 2, 3, 4, 5, 6, 0];
    const rows = wf.metrics.map(
      (m) => `${m.label}: ${order.map((wd, idx) => `${weekdayLabel(wd, true)} ${wf.n[idx] ? m.avg[idx] : "–"}`).join(", ")}`,
    );
    L.push("Average check-in feelings by weekday (1-10):\n" + rows.map((r) => `- ${r}`).join("\n"));
  }

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
