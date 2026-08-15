import { AppData, DayScore } from "./types";
import { sleepDurationMinutes } from "./date";

/*
  A tiny "what-if" engine: fit a simple linear relationship between how long you slept and
  several same-day outcomes (productivity, mood, energy, wellbeing, Life Score), then let the
  user drag a slider to see the modelled effect of sleeping more/less. This is correlation
  fitted to the user's own data — a rough projection, never a promise.
*/

export interface WhatIfOutcome {
  key: string;
  label: string; // English i18n key
  baseline: number; // recent average of this outcome
  slopePerHour: number; // change in outcome per extra hour of sleep
  min: number;
  max: number;
  r: number; // correlation strength (−1..1)
  decimals: number;
}

export interface WhatIfModel {
  avgSleepHours: number;
  n: number;
  outcomes: WhatIfOutcome[]; // only outcomes with a usable relationship
}

function linreg(xs: number[], ys: number[]): { slope: number; r: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, r: 0 };
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return { slope: 0, r: 0 };
  const slope = sxy / sxx;
  const r = sxy / Math.sqrt(sxx * syy);
  return { slope, r };
}

const MIN_PAIRS = 8;
const MIN_R = 0.12;

export function whatIfSleep(data: AppData, history: DayScore[]): WhatIfModel {
  const byDate = new Map(history.map((h) => [h.date, h]));
  const reviewBy = new Map(data.reviews.map((r) => [r.date, r]));
  const healthBy = new Map(data.health.map((h) => [h.date, h]));

  // x = sleep minutes on a given date; collect paired outcomes.
  const x: number[] = [];
  const prod: number[] = [];
  const mood: number[] = [];
  const energy: number[] = [];
  const wellbeing: number[] = [];
  const life: number[] = [];

  for (const s of data.sleep) {
    const mins = sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0);
    if (mins <= 0) continue;
    const r = reviewBy.get(s.date);
    const h = healthBy.get(s.date);
    const ds = byDate.get(s.date);
    // Push aligned values, using NaN when the outcome is missing for that day.
    x.push(mins);
    prod.push(r?.productivity ?? NaN);
    mood.push(r?.mood ?? NaN);
    energy.push(r?.energy ?? NaN);
    wellbeing.push(h?.wellbeing ?? NaN);
    life.push(ds && ds.lifeScore > 0 ? ds.lifeScore : NaN);
  }

  const avgSleepMin = x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0;

  const build = (ys: number[], key: string, label: string, min: number, max: number, decimals: number): WhatIfOutcome | null => {
    const px: number[] = [];
    const py: number[] = [];
    for (let i = 0; i < ys.length; i++) {
      if (!Number.isNaN(ys[i])) {
        px.push(x[i]);
        py.push(ys[i]);
      }
    }
    if (px.length < MIN_PAIRS) return null;
    const { slope, r } = linreg(px, py);
    if (Math.abs(r) < MIN_R) return null;
    const baseline = py.reduce((a, b) => a + b, 0) / py.length;
    return { key, label, baseline, slopePerHour: slope * 60, min, max, r, decimals };
  };

  const outcomes = [
    build(life, "lifeScore", "Life Score", 0, 100, 0),
    build(prod, "productivity", "Productivity", 1, 10, 1),
    build(energy, "energy", "Energy", 1, 10, 1),
    build(mood, "mood", "Mood", 1, 10, 1),
    build(wellbeing, "wellbeing", "Wellbeing", 1, 10, 1),
  ].filter((o): o is WhatIfOutcome => o !== null);

  return { avgSleepHours: avgSleepMin / 60, n: x.length, outcomes };
}

/** Projected outcome value at a chosen sleep duration (hours), clamped to its range. */
export function project(o: WhatIfOutcome, model: WhatIfModel, sleepHours: number): number {
  const v = o.baseline + o.slopePerHour * (sleepHours - model.avgSleepHours);
  return Math.max(o.min, Math.min(o.max, v));
}
