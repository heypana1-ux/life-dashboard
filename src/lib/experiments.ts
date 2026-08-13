import { AppData, Experiment } from "./types";
import { computeDay } from "./score";
import { addDays, sleepDurationMinutes, todayISO } from "./date";

/*
  Life Experiments: compare one outcome metric between days where a self-chosen condition was
  met vs. not, over the experiment's window. This is an OBSERVATIONAL comparison of the user's
  own data — a correlation, never a causal or medical claim. Requires a minimum sample in each
  group before reporting anything.
*/

const MIN_PER_GROUP = 3;

export interface ExperimentResult {
  enough: boolean;
  nMet: number;
  nNot: number;
  metMean: number;
  notMean: number;
  /** Signed % difference of the "condition met" group vs. the other. */
  diffPct: number;
  daysElapsed: number;
  daysTotal: number;
}

/** Bedtime in "minutes since noon-anchored midnight": 23:15 -> 1395, 00:30 -> 1470. */
function bedtimeMinutes(bedTime: string): number {
  const [h, m] = bedTime.split(":").map(Number);
  return (h < 12 ? h + 24 : h) * 60 + m;
}

function conditionMet(data: AppData, exp: Experiment, date: string): boolean | null {
  const sleep = data.sleep.find((s) => s.date === date);
  switch (exp.condition) {
    case "bedtimeBefore":
      if (!sleep) return null;
      return bedtimeMinutes(sleep.bedTime) < (exp.threshold ?? 24 * 60);
    case "sleepAtLeast":
      if (!sleep) return null;
      return sleepDurationMinutes(sleep.bedTime, sleep.wakeTime, sleep.fallAsleepMinutes ?? 0) >= (exp.threshold ?? 450);
    case "trained": {
      const workout = data.workouts.some((w) => w.date === date);
      const sportIds = new Set(data.habits.filter((h) => h.area === "sport" && h.kind === "build").map((h) => h.id));
      const habitTrained = data.habitLogs.some((l) => l.date === date && l.done && sportIds.has(l.habitId));
      return workout || habitTrained;
    }
    case "habitDone":
      if (!exp.habitId) return null;
      return data.habitLogs.some((l) => l.date === date && l.done && l.habitId === exp.habitId);
    case "manual":
      // The user marks the days the condition was true; unmarked days count as "not met".
      return (exp.manualDates ?? []).includes(date);
    default:
      return null;
  }
}

function metricValue(data: AppData, exp: Experiment, date: string): number | null {
  if (exp.metric === "lifeScore") {
    const s = computeDay(data, date).lifeScore;
    return s && s > 0 ? s : null;
  }
  if (exp.metric === "sleep") {
    const sleep = data.sleep.find((s) => s.date === date);
    return sleep ? sleepDurationMinutes(sleep.bedTime, sleep.wakeTime, sleep.fallAsleepMinutes ?? 0) : null;
  }
  const r = data.reviews.find((x) => x.date === date);
  if (!r) return null;
  return r[exp.metric]; // productivity | mood | energy (1..10)
}

export function evaluateExperiment(data: AppData, exp: Experiment): ExperimentResult {
  const today = todayISO();
  // Retrospective analysis: look back over the last `days` days (ending today) and
  // classify each day into "condition met" vs. not. This uses the history you already
  // have, so an experiment produces a result immediately instead of only counting
  // forward from its creation date.
  const span = Math.max(1, exp.days);
  const start = addDays(today, -(span - 1));
  const window = daysBetween(start, today);

  const met: number[] = [];
  const not: number[] = [];
  for (const date of window) {
    const cond = conditionMet(data, exp, date);
    const val = metricValue(data, exp, date);
    if (cond === null || val === null) continue;
    (cond ? met : not).push(val);
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const metMean = mean(met);
  const notMean = mean(not);
  const diffPct = notMean > 0 ? Math.round(((metMean - notMean) / notMean) * 100) : 0;

  return {
    enough: met.length >= MIN_PER_GROUP && not.length >= MIN_PER_GROUP,
    nMet: met.length,
    nNot: not.length,
    metMean: Math.round(metMean * 10) / 10,
    notMean: Math.round(notMean * 10) / 10,
    diffPct,
    daysElapsed: window.length,
    daysTotal: exp.days,
  };
}

function daysBetween(startISO: string, endISO: string): string[] {
  if (endISO < startISO) return [];
  const out: string[] = [];
  let cur = startISO;
  for (let i = 0; i < 4000; i++) {
    out.push(cur);
    if (cur === endISO) break;
    cur = addDays(cur, 1);
  }
  return out;
}
