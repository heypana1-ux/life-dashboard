import { DayScore, Redemption } from "./types";

/*
  A simple, transparent points economy for real-life rewards the user defines themselves.
  You earn points each logged day roughly equal to your Life Score ÷ 10 (score 70 → 7 pts).
  Points are spent by redeeming a reward; the balance = everything earned minus everything spent.
  Nothing here touches the Life Score or ELO — it's a motivational layer on top.
*/

/** Points earned on a single day from its Life Score. */
export function dayPoints(lifeScore: number): number {
  return lifeScore > 0 ? Math.round(lifeScore / 10) : 0;
}

/** Total points ever earned across the history. */
export function pointsEarned(history: DayScore[]): number {
  return history.reduce((s, h) => s + dayPoints(h.lifeScore), 0);
}

/** Current spendable balance = earned − redeemed. */
export function pointsBalance(history: DayScore[], redemptions: Redemption[]): number {
  const spent = redemptions.reduce((s, r) => s + r.cost, 0);
  return pointsEarned(history) - spent;
}

/** Average points per day over the last `days` logged days (for "how long to save" estimates). */
export function dailyRate(history: DayScore[], days = 14): number {
  const scored = history.filter((h) => h.lifeScore > 0).slice(-days);
  if (scored.length === 0) return 0;
  return scored.reduce((s, h) => s + dayPoints(h.lifeScore), 0) / scored.length;
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
