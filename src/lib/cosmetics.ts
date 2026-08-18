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
