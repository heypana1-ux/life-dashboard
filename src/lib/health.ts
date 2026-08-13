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
