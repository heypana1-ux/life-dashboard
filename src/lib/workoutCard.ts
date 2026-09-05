import { Workout } from "./types";
import { MUSCLES, MUSCLE_LABEL, Muscle, muscleFor } from "./exercises";
import { describeSet, setIsLogged, setLoadKg, setScore, setSeconds } from "./trainingStats";
import { fmtDuration, fmtLong } from "./date";
import { paceLabel, sportKind } from "./sports";
import type { WorkoutCard, ImageMuscleGroup } from "./workoutImage";

/*
  Turns a logged workout into the card the share image draws.

  Two things shape the result:
   - Only exercises with at least one real set make it in. A row you added and never filled
     would otherwise take up a block of the card and say nothing.
   - A session without sets (a run, a class, a sparring round) drops the exercise part
     entirely and is described by its duration, distance and how it felt.
*/

type T = (k: string, v?: Record<string, string | number>) => string;

const MUSCLE_ORDER = new Map<string, number>(MUSCLES.map((m, i) => [m, i] as const));

function muscleLabel(m: string, t: T): string {
  return m in MUSCLE_LABEL ? t(MUSCLE_LABEL[m as Muscle]) : t("Other");
}

/** Groups the workout's exercises by muscle, in the catalogue's own order. */
function buildGroups(w: Workout, t: T): ImageMuscleGroup[] {
  const byMuscle = new Map<string, ImageMuscleGroup>();
  for (const ex of w.exercises) {
    const name = ex.name.trim();
    if (!name) continue;
    const sets = ex.sets.filter((s) => setIsLogged(name, s));
    if (sets.length === 0) continue;
    const best = Math.max(...sets.map((s) => setScore(name, s)));
    const muscle = ex.muscle || muscleFor(name) || "other";
    const group = byMuscle.get(muscle) ?? { label: muscleLabel(muscle, t), exercises: [] };
    group.exercises.push({
      name,
      sets: sets.map((s) => ({
        text: describeSet(name, s, t),
        // Only worth marking when there is something to stand out from.
        best: sets.length > 1 && best > 0 && setScore(name, s) === best,
      })),
    });
    byMuscle.set(muscle, group);
  }
  return [...byMuscle.entries()]
    .sort((a, b) => (MUSCLE_ORDER.get(a[0]) ?? 99) - (MUSCLE_ORDER.get(b[0]) ?? 99))
    .map(([, g]) => g);
}

export function buildWorkoutCard(w: Workout, t: T): WorkoutCard {
  const groups = buildGroups(w, t);
  const kind = sportKind(w.sport);

  let sets = 0;
  let tonnage = 0;
  let seconds = 0;
  for (const ex of w.exercises) {
    const name = ex.name.trim();
    if (!name) continue;
    for (const s of ex.sets) {
      if (!setIsLogged(name, s)) continue;
      sets += 1;
      const sec = setSeconds(name, s);
      if (sec > 0) seconds += sec;
      else tonnage += setLoadKg(s) * (s.reps ?? 0);
    }
  }

  const stats: { label: string; value: string }[] = [{ label: t("Duration"), value: fmtDuration(w.durationMin) }];
  if (groups.length) {
    stats.push({ label: t("Sets"), value: String(sets) });
    if (tonnage > 0) stats.push({ label: t("Volume"), value: `${Math.round(tonnage).toLocaleString()} kg` });
    else if (seconds > 0) stats.push({ label: t("Hold"), value: `${seconds} s` });
    stats.push({ label: t("Exercises"), value: String(groups.reduce((n, g) => n + g.exercises.length, 0)) });
  } else {
    if (w.distanceKm) stats.push({ label: t("Distance"), value: `${w.distanceKm} km` });
    const pace = paceLabel(w.distanceKm, w.durationMin);
    if (pace) stats.push({ label: t("Pace"), value: pace });
    if (w.rounds) stats.push({ label: t("Rounds"), value: String(w.rounds) });
    if (w.avgPulse) stats.push({ label: t("Avg pulse"), value: `${w.avgPulse} bpm` });
  }

  const ratings: { label: string; value: number }[] = [];
  const add = (label: string, v?: number) => {
    if (v && v > 0) ratings.push({ label, value: v });
  };
  add(t("Intensity"), w.intensity);
  add(t("Performance"), w.performance);
  add(t("Fun"), w.fun);
  add(t("Energy before"), w.energyBefore);
  add(t("Energy after"), w.energyAfter);

  // The footer says something the tiles don't: which muscles took the work, or how it moved.
  let footer = fmtLong(w.date);
  if (groups.length) footer = groups.map((g) => g.label).join(" · ");
  else if (kind === "distance" && w.avgPulse) footer = `${w.avgPulse} bpm ${t("average")}`;

  return {
    sport: w.sport,
    date: fmtLong(w.date),
    stats: stats.slice(0, 4),
    ratings,
    groups,
    note: w.notes?.trim().split("\n")[0] || undefined,
    footer,
  };
}

/** A filename that says what it is without needing the app: "strength-training-2026-09-05.png". */
export function workoutImageName(w: Workout): string {
  const slug = w.sport
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug || "workout"}-${w.date}.png`;
}
