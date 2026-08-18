import { AppData, DayScore, Redemption } from "./types";

/*
  A transparent points economy for rewards (real-life ones the user defines, plus cosmetics).
  Points reward ACTIVITY: the more you actually log and do on a day, the more you earn — so an
  active day is worth far more than a barely-there one. On top of that a small quality bonus
  scales with the Life Score. Points are spent by redeeming a reward; balance = earned − spent.
  Nothing here touches the Life Score or ELO — it's a motivational layer on top.

    per action:  build habit done +2 · workout +4 · journal +3 · check-in +3 · sleep +2 ·
                 each completed morning-focus item +1
    quality:     + round(lifeScore / 20)   (0..5)

  A full, active day lands around 15-20 points; a lazy day only a handful.
*/

const ACT = { habit: 2, workout: 4, journal: 3, checkin: 3, sleep: 2, focus: 1 };

/** Map of date → activity points, built in one pass over the data. */
function activityByDate(data: AppData): Map<string, number> {
  const m = new Map<string, number>();
  const add = (date: string, n: number) => m.set(date, (m.get(date) ?? 0) + n);
  const buildIds = new Set(
    data.habits.filter((h) => h.kind === "build" && !h.archived).map((h) => h.id),
  );
  for (const l of data.habitLogs)
    if (buildIds.has(l.habitId) && (l.done || (l.count ?? 0) > 0)) add(l.date, ACT.habit);
  for (const w of data.workouts) add(w.date, ACT.workout);
  for (const j of data.journal) add(j.date, ACT.journal);
  for (const r of data.reviews) add(r.date, ACT.checkin);
  for (const s of data.sleep) add(s.date, ACT.sleep);
  for (const f of data.focus) add(f.date, f.items.filter((i) => i.done).length * ACT.focus);
  return m;
}

/** Small quality bonus (0..5) from a day's Life Score. */
function qualityBonus(lifeScore: number): number {
  return lifeScore > 0 ? Math.round(lifeScore / 20) : 0;
}

/** Points earned on a single day = activity that day + a small Life-Score quality bonus. */
export function dayPoints(data: AppData, date: string, lifeScore: number): number {
  return (activityByDate(data).get(date) ?? 0) + qualityBonus(lifeScore);
}

/** Total points ever earned across the history. */
export function pointsEarned(history: DayScore[], data: AppData): number {
  const act = activityByDate(data);
  return history.reduce((s, h) => s + (act.get(h.date) ?? 0) + qualityBonus(h.lifeScore), 0);
}

/** Current spendable balance = earned − redeemed. */
export function pointsBalance(history: DayScore[], redemptions: Redemption[], data: AppData): number {
  const spent = redemptions.reduce((s, r) => s + r.cost, 0);
  return pointsEarned(history, data) - spent;
}

/** Average points per day over the last `days` active days (for "how long to save" estimates). */
export function dailyRate(history: DayScore[], data: AppData, days = 14): number {
  const act = activityByDate(data);
  const recent = history.filter((h) => h.lifeScore > 0 || (act.get(h.date) ?? 0) > 0).slice(-days);
  if (recent.length === 0) return 0;
  return recent.reduce((s, h) => s + (act.get(h.date) ?? 0) + qualityBonus(h.lifeScore), 0) / recent.length;
}

/** Whole days needed to save `cost` points from the current balance at the current rate. */
export function daysToAfford(cost: number, balance: number, rate: number): number | null {
  if (balance >= cost) return 0;
  if (rate <= 0) return null;
  return Math.ceil((cost - balance) / rate);
}

export interface RewardTemplate {
  name: string; // English i18n key
  cost: number;
  icon: string;
}

/** Concrete starter rewards the user can add with one tap, then tweak. */
export const REWARD_TEMPLATES: RewardTemplate[] = [
  { name: "Favourite coffee", cost: 80, icon: "☕" },
  { name: "Favourite meal", cost: 140, icon: "🍔" },
  { name: "Gaming evening", cost: 220, icon: "🎮" },
  { name: "Movie night", cost: 260, icon: "🎬" },
  { name: "New book", cost: 350, icon: "📚" },
  { name: "Lazy morning", cost: 450, icon: "😴" },
  { name: "Small treat", cost: 600, icon: "🛍️" },
  { name: "A full day off", cost: 900, icon: "🏖️" },
];
