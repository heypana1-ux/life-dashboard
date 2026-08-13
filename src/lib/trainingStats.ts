import { Workout } from "./types";
import { muscleFor } from "./exercises";
import { todayISO, addDays } from "./date";

/*
  Strength-training analytics derived from logged workouts:
   - per-exercise progression (best set weight and estimated 1RM over time)
   - per-muscle-group training volume (tonnage = reps × weight, summed)
*/

/** Epley estimate of a one-rep max from a set. */
export function est1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

export interface ExercisePoint {
  date: string;
  bestWeight: number;
  best1RM: number;
  volume: number;
}

/** Distinct exercise names that have at least one logged set with weight. */
export function loggedExerciseNames(workouts: Workout[]): string[] {
  const names = new Set<string>();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.name.trim() && ex.sets.some((s) => (s.weight ?? 0) > 0 || (s.reps ?? 0) > 0)) {
        names.add(ex.name.trim());
      }
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** One data point per workout day that included the exercise. */
export function exerciseHistory(workouts: Workout[], name: string): ExercisePoint[] {
  const key = name.trim().toLowerCase();
  const points: ExercisePoint[] = [];
  for (const w of workouts) {
    let bestWeight = 0;
    let best1RM = 0;
    let volume = 0;
    let found = false;
    for (const ex of w.exercises) {
      if (ex.name.trim().toLowerCase() !== key) continue;
      found = true;
      for (const s of ex.sets) {
        const weight = s.weight ?? 0;
        const reps = s.reps ?? 0;
        if (weight > bestWeight) bestWeight = weight;
        best1RM = Math.max(best1RM, est1RM(weight, reps));
        volume += weight * reps;
      }
    }
    if (found) points.push({ date: w.date, bestWeight, best1RM, volume: Math.round(volume) });
  }
  return points.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface MuscleVolume {
  muscle: string;
  volume: number; // tonnage
  sets: number;
}

/** Total tonnage + set count per muscle group over the last `days` days. */
export function muscleVolume(workouts: Workout[], days = 30): MuscleVolume[] {
  const since = addDays(todayISO(), -(days - 1));
  const agg = new Map<string, { volume: number; sets: number }>();
  for (const w of workouts) {
    if (w.date < since) continue;
    for (const ex of w.exercises) {
      const muscle = ex.muscle || muscleFor(ex.name) || "other";
      const cur = agg.get(muscle) ?? { volume: 0, sets: 0 };
      for (const s of ex.sets) {
        const weight = s.weight ?? 0;
        const reps = s.reps ?? 0;
        if (weight > 0 || reps > 0) cur.sets += 1;
        cur.volume += weight * reps;
      }
      agg.set(muscle, cur);
    }
  }
  return [...agg.entries()]
    .map(([muscle, v]) => ({ muscle, volume: Math.round(v.volume), sets: v.sets }))
    .sort((a, b) => b.volume - a.volume);
}
