import { AppData, AreaKey, DayScore } from "./types";
import { addDays, todayISO } from "./date";
import { budgetForMonth, currentMonth, shiftMonth } from "./finance";

/*
  A data-driven counterpart to the subjective Wheel of Life. It scores the life dimensions the
  app can actually measure (1..10) from the last ~30 days of logged data, reusing the scoring
  engine's per-area category scores. Purely subjective dimensions with no data behind them
  (relationships, home/environment) are intentionally left out — the user rates those by feel.

  Keys deliberately match WHEEL_DIMS so the two wheels can be overlaid on the same axes:
    health ← sport + sleep + wellbeing   career ← productivity
    growth ← learning                     fun    ← creativity
    spirituality ← reflection             finances ← savings rate
*/

const RECENT_DAYS = 30;

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Map a 0..100 value onto the wheel's 1..10 scale. */
function to10(v: number): number {
  return Math.max(1, Math.min(10, Math.round(v / 10)));
}

/** Finance health as a 0..100 proxy from the savings rate (this month, else last), or null. */
function financeScore(data: AppData): number | null {
  const txs = data.finances.transactions;
  if (txs.length === 0) return null;
  let m = currentMonth();
  let b = budgetForMonth(txs, m);
  if (b.income === 0 && b.expenses === 0) {
    m = shiftMonth(m, -1);
    b = budgetForMonth(txs, m);
  }
  if (b.income === 0 && b.expenses === 0) return null;
  // Savings rate can be negative or >100; clamp to 0..100 as a rough "financial health".
  return Math.max(0, Math.min(100, b.savingsRate));
}

/** Data-driven 1..10 scores keyed by WHEEL_DIMS keys. Only keys with enough data are present. */
export function dataWheelScores(data: AppData, history: DayScore[]): Record<string, number> {
  const today = todayISO();
  const since = addDays(today, -(RECENT_DAYS - 1));
  const recent = history.filter((h) => h.date >= since && h.lifeScore > 0);

  const areaAvg = (a: AreaKey): number | null => {
    const xs = recent.map((h) => h.categories[a]).filter((v): v is number => v != null);
    return xs.length >= 3 ? mean(xs) : null;
  };

  const out: Record<string, number> = {};

  // Health & fitness: blend of sport, sleep and self-reported wellbeing (1..10 → 0..100).
  const sport = areaAvg("sport");
  const sleep = areaAvg("sleep");
  const wbVals = data.health.filter((h) => h.date >= since && h.wellbeing != null).map((h) => (h.wellbeing as number) * 10);
  const wb = wbVals.length >= 3 ? mean(wbVals) : null;
  const healthParts = [sport, sleep, wb].filter((v): v is number => v != null);
  if (healthParts.length) out.health = to10(mean(healthParts));

  const prod = areaAvg("productivity");
  if (prod != null) out.career = to10(prod);
  const learn = areaAvg("learning");
  if (learn != null) out.growth = to10(learn);
  const crea = areaAvg("creativity");
  if (crea != null) out.fun = to10(crea);
  const refl = areaAvg("reflection");
  if (refl != null) out.spirituality = to10(refl);

  const fin = financeScore(data);
  if (fin != null) out.finances = to10(fin);

  return out;
}
