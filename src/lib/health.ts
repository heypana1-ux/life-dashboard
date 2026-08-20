/*
  Health tracking catalogue. Symptoms are tracked with a 1..3 severity and correlated with
  the rest of your data, but never affect the Life Score.
*/

export const SYMPTOMS = [
  "headache",
  "stomachache",
  "sorethroat",
  "congestion",
  "nausea",
  "dizziness",
  "backpain",
  "soreness",
  "fatigue",
  "cough",
  "fever",
  "cramps",
] as const;
export type Symptom = (typeof SYMPTOMS)[number];

export const SYMPTOM_LABEL: Record<Symptom, string> = {
  headache: "Headache",
  stomachache: "Stomach ache",
  sorethroat: "Sore throat",
  congestion: "Congestion",
  nausea: "Nausea",
  dizziness: "Dizziness",
  backpain: "Back pain",
  soreness: "Muscle soreness",
  fatigue: "Fatigue",
  cough: "Cough",
  fever: "Fever",
  cramps: "Cramps",
} as const;

export const SEVERITY_LABEL: Record<number, string> = {
  1: "Mild",
  2: "Moderate",
  3: "Strong",
};

/** Count of symptoms present in a log (severity ≥ 1). */
export function symptomCount(symptoms?: Record<string, number>): number {
  if (!symptoms) return 0;
  return Object.values(symptoms).filter((v) => v > 0).length;
}

/** The wellbeing sub-dimensions the user rates (1..10). Stress is inverted when averaged. */
export const WELLBEING_DIMS = [
  { key: "physical", label: "Physical", invert: false },
  { key: "mental", label: "Mental", invert: false },
  { key: "energy", label: "Energy", invert: false },
  { key: "stress", label: "Stress", invert: true },
] as const;

export type WellbeingDim = (typeof WELLBEING_DIMS)[number]["key"];

/** Average the rated sub-dimensions (stress inverted) into an overall wellbeing 1..10.
 *  Returns null if none are set, so a legacy log's own `wellbeing` can be kept. */
export function computeWellbeing(log: { physical?: number; mental?: number; energy?: number; stress?: number }): number | null {
  const vals: number[] = [];
  for (const d of WELLBEING_DIMS) {
    const v = log[d.key];
    if (v != null) vals.push(d.invert ? 11 - v : v);
  }
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
