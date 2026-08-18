/*
  Cosmetic collectibles beyond accent themes — purely visual, never touching data or the score.
  Ownership is tracked in rewards.owned as prefixed ids ("ring:ember", "title:iron", …); the
  free defaults are always owned. Buying one spends points (a Redemption) and marks it owned.
*/

/* ---------------- Score-ring skins ---------------- */

export interface RingSkin {
  id: string; // stored owned as `ring:${id}`
  name: string; // English key
  cost: number; // 0 = free default
  /** Gradient stops for the ring stroke + swatch preview. */
  gradA: string;
  gradB: string;
  /** Optional glow colour behind the ring. */
  glow?: string;
}

export const RING_SKINS: RingSkin[] = [
  { id: "default", name: "Classic", cost: 0, gradA: "#6366f1", gradB: "#4f46e5" },
  { id: "ember", name: "Ember", cost: 250, gradA: "#f59e0b", gradB: "#ef4444", glow: "rgba(239,68,68,0.45)" },
  { id: "ocean", name: "Ocean", cost: 350, gradA: "#06b6d4", gradB: "#3b82f6", glow: "rgba(6,182,212,0.45)" },
  { id: "aurora", name: "Aurora", cost: 450, gradA: "#22c55e", gradB: "#3b82f6", glow: "rgba(34,197,94,0.4)" },
  { id: "neon", name: "Neon", cost: 650, gradA: "#d946ef", gradB: "#22d3ee", glow: "rgba(217,70,239,0.5)" },
  { id: "gold", name: "Gold", cost: 900, gradA: "#fbbf24", gradB: "#d97706", glow: "rgba(251,191,36,0.5)" },
  { id: "rainbow", name: "Prism", cost: 1300, gradA: "#f43f5e", gradB: "#3b82f6", glow: "rgba(139,92,246,0.5)" },
];

export function ringOwned(id: string, owned: string[] = []): boolean {
  return id === "default" || owned.includes(`ring:${id}`);
}

export function ringSkinById(id: string | undefined): RingSkin {
  return RING_SKINS.find((s) => s.id === id) ?? RING_SKINS[0];
}

/* ---------------- Profile titles ---------------- */

export interface TitleCosmetic {
  id: string; // stored owned as `title:${id}`; "none" is the free default
  name: string; // English key — the displayed title text
  cost: number;
}

export const TITLES: TitleCosmetic[] = [
  { id: "none", name: "No title", cost: 0 },
  { id: "rising", name: "Rising Star", cost: 150 },
  { id: "earlybird", name: "Early Bird", cost: 300 },
  { id: "nightowl", name: "Night Owl", cost: 300 },
  { id: "iron", name: "Iron-Willed", cost: 500 },
  { id: "zen", name: "Zen Master", cost: 600 },
  { id: "relentless", name: "Relentless", cost: 800 },
  { id: "machine", name: "The Machine", cost: 1000 },
  { id: "legend", name: "Living Legend", cost: 1500 },
];

export function titleOwned(id: string, owned: string[] = []): boolean {
  return id === "none" || owned.includes(`title:${id}`);
}

/** The displayed title text for a selected id, or null for the default/none. */
export function titleName(id: string | undefined): string | null {
  if (!id || id === "none") return null;
  return TITLES.find((t) => t.id === id)?.name ?? null;
}

/* ---------------- Badges (emoji flair) ---------------- */

export interface BadgeCosmetic {
  id: string; // stored owned as `badge:${id}`; "none" is the free default
  emoji: string;
  name: string; // English key
  cost: number;
}

export const BADGES: BadgeCosmetic[] = [
  { id: "none", emoji: "", name: "No badge", cost: 0 },
  { id: "flame", emoji: "🔥", name: "Flame", cost: 150 },
  { id: "star", emoji: "⭐", name: "Star", cost: 200 },
  { id: "bolt", emoji: "⚡", name: "Bolt", cost: 300 },
  { id: "sparkle", emoji: "✨", name: "Sparkle", cost: 350 },
  { id: "rocket", emoji: "🚀", name: "Rocket", cost: 500 },
  { id: "trophy", emoji: "🏆", name: "Trophy", cost: 700 },
  { id: "diamond", emoji: "💎", name: "Diamond", cost: 900 },
  { id: "crown", emoji: "👑", name: "Crown", cost: 1200 },
];

export function badgeOwned(id: string, owned: string[] = []): boolean {
  return id === "none" || owned.includes(`badge:${id}`);
}

/** The emoji for a selected badge id, or null for none. */
export function badgeEmoji(id: string | undefined): string | null {
  if (!id || id === "none") return null;
  return BADGES.find((b) => b.id === id)?.emoji ?? null;
}
