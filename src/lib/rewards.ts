import { Accent } from "./types";

/*
  Cosmetic rewards — pure fun, nothing that changes tracking or data. Accent themes are
  obtained two ways:
    - the starter set (calm/aurora/mono) is always available, cost 0;
    - three themes unlock automatically as you level up (and can also be bought early);
    - the rest are shop-only: bought with points earned by living well.
  A theme is "owned" if it's unlocked by level OR has been purchased (rewards.owned).
*/

export interface AccentReward {
  accent: Accent;
  name: string; // English key
  /** Level at which it unlocks for free. Use a very high value for shop-only themes. */
  unlockLevel: number;
  /** Points to buy it in the shop (0 = always free / default set). */
  cost: number;
}

const SHOP_ONLY = 999; // never unlocks by level — obtained only by purchase

export const ACCENT_REWARDS: AccentReward[] = [
  { accent: "calm", name: "Calm", unlockLevel: 1, cost: 0 },
  { accent: "aurora", name: "Aurora", unlockLevel: 1, cost: 0 },
  { accent: "mono", name: "Mono", unlockLevel: 1, cost: 0 },
  { accent: "sunset", name: "Sunset", unlockLevel: 3, cost: 300 },
  { accent: "forest", name: "Forest", unlockLevel: 6, cost: 500 },
  { accent: "rose", name: "Rose", unlockLevel: 10, cost: 800 },
  { accent: "ocean", name: "Ocean", unlockLevel: SHOP_ONLY, cost: 600 },
  { accent: "mint", name: "Mint", unlockLevel: SHOP_ONLY, cost: 700 },
  { accent: "gold", name: "Gold", unlockLevel: SHOP_ONLY, cost: 850 },
  { accent: "grape", name: "Grape", unlockLevel: SHOP_ONLY, cost: 950 },
  { accent: "crimson", name: "Crimson", unlockLevel: SHOP_ONLY, cost: 1100 },
  { accent: "midnight", name: "Midnight", unlockLevel: SHOP_ONLY, cost: 1400 },
];

/** Preview gradient for each accent (used by the shop and achievements grids). */
export const ACCENT_SWATCH: Record<Accent, string> = {
  calm: "linear-gradient(135deg,#6366f1,#4f46e5)",
  aurora: "linear-gradient(135deg,#06b6d4,#4f46e5)",
  mono: "linear-gradient(135deg,#52525b,#27272a)",
  sunset: "linear-gradient(135deg,#f97316,#db2777)",
  forest: "linear-gradient(135deg,#22c55e,#0d9488)",
  rose: "linear-gradient(135deg,#f43f5e,#a855f7)",
  ocean: "linear-gradient(135deg,#0ea5e9,#2563eb)",
  mint: "linear-gradient(135deg,#10b981,#06b6d4)",
  gold: "linear-gradient(135deg,#f59e0b,#d97706)",
  grape: "linear-gradient(135deg,#8b5cf6,#6366f1)",
  crimson: "linear-gradient(135deg,#ef4444,#b91c1c)",
  midnight: "linear-gradient(135deg,#4f46e5,#1e293b)",
};

/** Owned = unlocked by reaching its level, or purchased with points. */
export function accentOwned(accent: Accent, level: number, owned: string[] = []): boolean {
  const r = ACCENT_REWARDS.find((x) => x.accent === accent);
  if (!r) return true;
  return level >= r.unlockLevel || owned.includes(accent);
}
