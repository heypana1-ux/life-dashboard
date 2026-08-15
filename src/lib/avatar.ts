/*
  A simple, cute layered-SVG avatar. Users pick base look (skin, hair, face, shirt) and
  unlock cosmetics (hats, glasses, extra hair) by leveling up. Purely cosmetic.
*/

import { AvatarConfig } from "./types";
export type { AvatarConfig };

export interface Option {
  id: string;
  name: string; // English key
  unlock: number; // required level (1 = always)
}

export const SKINS = ["#f6d3b5", "#eab894", "#d19a66", "#a86b3c", "#7a4a24", "#f9dcc4"];
export const HAIR_COLORS = ["#2b1b12", "#6b4423", "#c08a3e", "#e6c56a", "#b0413e", "#9aa0a6", "#ececef", "#6d5bd0"];
export const SHIRT_COLORS = ["#4f46e5", "#0ea5e9", "#16a34a", "#f59e0b", "#ef4444", "#db2777", "#111827", "#e5e7eb"];

export const HAIR_STYLES: Option[] = [
  { id: "none", name: "Bald", unlock: 1 },
  { id: "short", name: "Short", unlock: 1 },
  { id: "buzz", name: "Buzz", unlock: 1 },
  { id: "long", name: "Long", unlock: 1 },
  { id: "curly", name: "Curly", unlock: 3 },
  { id: "bun", name: "Top bun", unlock: 5 },
  { id: "afro", name: "Afro", unlock: 7 },
  { id: "mohawk", name: "Mohawk", unlock: 9 },
];

export const FACES: Option[] = [
  { id: "happy", name: "Happy", unlock: 1 },
  { id: "neutral", name: "Neutral", unlock: 1 },
  { id: "cool", name: "Cool", unlock: 1 },
  { id: "wink", name: "Wink", unlock: 4 },
];

export const HATS: Option[] = [
  { id: "none", name: "No hat", unlock: 1 },
  { id: "cap", name: "Cap", unlock: 2 },
  { id: "beanie", name: "Beanie", unlock: 4 },
  { id: "party", name: "Party hat", unlock: 8 },
  { id: "crown", name: "Crown", unlock: 15 },
];

export const GLASSES: Option[] = [
  { id: "none", name: "None", unlock: 1 },
  { id: "glasses", name: "Glasses", unlock: 3 },
  { id: "sun", name: "Sunglasses", unlock: 6 },
];

export function defaultAvatar(): AvatarConfig {
  return { skin: SKINS[0], hair: "short", hairColor: HAIR_COLORS[0], face: "happy", shirt: SHIRT_COLORS[0], hat: "none", glasses: "none" };
}

export function randomAvatar(): AvatarConfig {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  return {
    skin: pick(SKINS),
    hair: pick(HAIR_STYLES.filter((h) => h.unlock === 1)).id,
    hairColor: pick(HAIR_COLORS),
    face: pick(FACES.filter((f) => f.unlock === 1)).id,
    shirt: pick(SHIRT_COLORS),
    hat: "none",
    glasses: "none",
  };
}

export function unlocked(unlock: number, level: number): boolean {
  return level >= unlock;
}
