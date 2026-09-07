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

/** Rough heart-rate zone from average pulse and age (max HR ≈ 220 − age). English label. */
export function hrZone(pulse?: number, age?: number | null): { pct: number; label: string } | null {
  if (!pulse || pulse <= 0 || !age || age <= 0) return null;
  const max = 220 - age;
  const pct = Math.round((pulse / max) * 100);
  let label = "Recovery";
  if (pct >= 90) label = "Maximum";
  else if (pct >= 80) label = "Threshold";
  else if (pct >= 70) label = "Aerobic";
  else if (pct >= 60) label = "Easy";
  return { pct, label };
}

/*
  Ticking a habit when you log a workout.

  A habit is the user's own words — "Krafttraining", "Laufen", "Gym" — and the sport is one of
  the catalogue's English names. So each sport carries the names people actually give it, in
  both languages the app speaks, and a habit matches when its name is (or contains) one of them.
*/

const SPORT_ALIASES: Record<string, string[]> = {
  "Strength Training": ["strengthtraining", "krafttraining", "kraft", "gym", "weights", "gewichte", "hanteln"],
  Running: ["running", "run", "laufen", "lauf", "joggen", "jogging", "joggen gehen"],
  Sprint: ["sprint", "sprints", "sprinten"],
  Cycling: ["cycling", "bike", "biking", "radfahren", "fahrrad", "rad"],
  Swimming: ["swimming", "swim", "schwimmen"],
  Rowing: ["rowing", "row", "rudern"],
  Walking: ["walking", "walk", "spazieren", "spaziergang", "gehen"],
  Hiking: ["hiking", "hike", "wandern", "wanderung"],
  Taekwondo: ["taekwondo", "tkd"],
  "Martial Arts": ["martialarts", "kampfsport", "kampfkunst"],
  Boxing: ["boxing", "boxen"],
  Kickboxing: ["kickboxing", "kickboxen"],
  Judo: ["judo"],
  Karate: ["karate"],
  BJJ: ["bjj", "jiujitsu", "brazilianjiujitsu"],
  Football: ["football", "soccer", "fussball"],
  Basketball: ["basketball"],
  Tennis: ["tennis"],
  Yoga: ["yoga"],
  Mobility: ["mobility", "mobilitaet", "beweglichkeit"],
  Stretching: ["stretching", "dehnen"],
};

/** Habit names that mean "any workout at all" — those get ticked by every sport. */
const ANY_SPORT_ALIASES = ["sport", "training", "trainieren", "workout", "exercise", "bewegung"];

/** Lower-case, letters and digits only — so "Kraft-Training 3×" and "krafttraining" meet. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\u00df/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Whether a habit with this name should count as done when a workout of this sport is logged.
 *
 * Matching is deliberately conservative: an alias has to be the whole habit name or a whole
 * chunk of it (at least 4 characters), so "Kraftraining 3x/Woche" matches Strength Training
 * while "Krafttraining planen" would too — but a habit called "Rad putzen" doesn't get ticked
 * by a bike ride it never claimed.
 */
export function habitMatchesSport(habitName: string, sport: string): boolean {
  const h = norm(habitName);
  if (!h) return false;
  const aliases = [norm(sport), ...(SPORT_ALIASES[sport] ?? []).map(norm), ...ANY_SPORT_ALIASES];
  return aliases.some((a) => a.length >= 4 && (h === a || h.includes(a)));
}
