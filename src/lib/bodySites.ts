import { Muscle } from "./exercises";

/*
  Body circumference sites the user can measure (cm). Each optionally maps to a muscle group
  so girth can be shown next to that muscle's training progress ("biceps size vs biceps work").
  Labels are English i18n keys.
*/

export interface BodySite {
  key: string;
  label: string;
  /** Related muscle group for cross-referencing training volume, when it makes sense. */
  muscle?: Muscle;
}

export const BODY_SITES: BodySite[] = [
  { key: "neck", label: "Neck" },
  { key: "shoulders", label: "Shoulders", muscle: "shoulders" },
  { key: "chest", label: "Chest", muscle: "chest" },
  { key: "waist", label: "Waist", muscle: "core" },
  { key: "hips", label: "Hips", muscle: "glutes" },
  { key: "biceps", label: "Biceps (flexed)", muscle: "biceps" },
  { key: "forearm", label: "Forearm", muscle: "forearms" },
  { key: "thigh", label: "Thigh", muscle: "quads" },
  { key: "calf", label: "Calf", muscle: "calves" },
];

export function siteLabel(key: string): string {
  return BODY_SITES.find((s) => s.key === key)?.label ?? key;
}

export function muscleForSite(key: string): Muscle | undefined {
  return BODY_SITES.find((s) => s.key === key)?.muscle;
}
