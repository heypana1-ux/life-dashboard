/*
  Sport catalogue. Each sport has a "kind" that decides which metrics make sense to log and
  how progress is measured:
    - strength : exercises with sets/reps/weight (est. 1RM)
    - distance : distance + duration → pace (running, swimming, cycling, rowing…)
    - rounds   : rounds/sessions + duration (martial arts, boxing…)
    - generic  : just duration + how it felt (team sports, yoga…)
  Unknown/custom sports are classified by name, falling back to "generic".
*/

export type SportKind = "strength" | "distance" | "rounds" | "generic";

export const SPORT_KIND: Record<string, SportKind> = {
  "Strength Training": "strength",
  Running: "distance",
  Sprint: "distance",
  Cycling: "distance",
  Swimming: "distance",
  Rowing: "distance",
  Walking: "distance",
  Hiking: "distance",
  Taekwondo: "rounds",
  "Martial Arts": "rounds",
  Boxing: "rounds",
  Kickboxing: "rounds",
  Judo: "rounds",
  Karate: "rounds",
  BJJ: "rounds",
  Football: "generic",
  Basketball: "generic",
  Tennis: "generic",
  Yoga: "generic",
  Mobility: "generic",
  Stretching: "generic",
};

export function sportKind(name: string): SportKind {
  const known = SPORT_KIND[name];
  if (known) return known;
  const n = name.toLowerCase();
  if (/(strength|lift|gym|weight)/.test(n)) return "strength";
  if (/(run|sprint|jog|cycl|bike|swim|row|walk|hik|ski|skate)/.test(n)) return "distance";
  if (/(box|karate|judo|kung|taekwon|jiu|bjj|mma|fight|kick|wrestl|muay)/.test(n)) return "rounds";
  return "generic";
}

/** Pace as mm:ss per km, or null if not computable. */
export function paceLabel(distanceKm?: number, durationMin?: number): string | null {
  if (!distanceKm || distanceKm <= 0 || !durationMin || durationMin <= 0) return null;
  const p = durationMin / distanceKm;
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  const mm = s === 60 ? m + 1 : m;
  const ss = s === 60 ? 0 : s;
  return `${mm}:${String(ss).padStart(2, "0")} /km`;
}

/** Average speed in km/h, or null. */
export function speedKmh(distanceKm?: number, durationMin?: number): number | null {
  if (!distanceKm || distanceKm <= 0 || !durationMin || durationMin <= 0) return null;
  return Math.round((distanceKm / (durationMin / 60)) * 10) / 10;
}
