import { Accent } from "./types";

/*
  Cosmetic rewards unlocked by leveling up — pure fun, nothing that changes tracking or data.
  Right now: extra accent themes. Locked ones show their required level.
*/

export interface AccentReward {
  accent: Accent;
  name: string; // English key
  unlockLevel: number;
}

export const ACCENT_REWARDS: AccentReward[] = [
  { accent: "calm", name: "Calm", unlockLevel: 1 },
  { accent: "aurora", name: "Aurora", unlockLevel: 1 },
  { accent: "mono", name: "Mono", unlockLevel: 1 },
  { accent: "sunset", name: "Sunset", unlockLevel: 3 },
  { accent: "forest", name: "Forest", unlockLevel: 6 },
  { accent: "rose", name: "Rose", unlockLevel: 10 },
];

export function accentUnlocked(accent: Accent, level: number): boolean {
  const r = ACCENT_REWARDS.find((x) => x.accent === accent);
  return !r || level >= r.unlockLevel;
}
