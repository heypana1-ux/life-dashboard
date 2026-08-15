import { WheelCheck } from "./types";

/*
  "Wheel of Life": a periodic self-assessment scoring 8 life dimensions 1..10. Purely
  self-reported — a reflection tool, not part of the Life Score. Labels are English i18n keys.
*/

export interface WheelDim {
  key: string;
  label: string;
  /** Short axis label for the radar chart. */
  short: string;
}

export const WHEEL_DIMS: WheelDim[] = [
  { key: "health", label: "Health & fitness", short: "Health" },
  { key: "career", label: "Career & work", short: "Career" },
  { key: "finances", label: "Money", short: "Money" },
  { key: "relationships", label: "Relationships", short: "Social" },
  { key: "growth", label: "Personal growth", short: "Growth" },
  { key: "fun", label: "Fun & recreation", short: "Fun" },
  { key: "environment", label: "Home & environment", short: "Home" },
  { key: "spirituality", label: "Meaning & purpose", short: "Meaning" },
];

export function blankWheelScores(): Record<string, number> {
  const s: Record<string, number> = {};
  for (const d of WHEEL_DIMS) s[d.key] = 5;
  return s;
}

/** Overall balance score: the average across dimensions (0..10). */
export function wheelAverage(scores: Record<string, number>): number {
  const xs = WHEEL_DIMS.map((d) => scores[d.key]).filter((v): v is number => typeof v === "number");
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function latestWheel(checks: WheelCheck[]): WheelCheck | null {
  return checks.length ? [...checks].sort((a, b) => (a.date < b.date ? 1 : -1))[0] : null;
}

export function previousWheel(checks: WheelCheck[]): WheelCheck | null {
  const sorted = [...checks].sort((a, b) => (a.date < b.date ? 1 : -1));
  return sorted.length >= 2 ? sorted[1] : null;
}
