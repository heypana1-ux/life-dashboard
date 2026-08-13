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

export interface PersonalRecord {
  name: string;
  best1RM: number;
  weight: number;
  reps: number;
  date: string;
  isNew: boolean; // set on the most recent session and beats the prior best
}

/** Best estimated 1RM per exercise, flagging records set in the latest session. */
export function personalRecords(workouts: Workout[]): PersonalRecord[] {
  const acc = new Map<string, { best1RM: number; weight: number; reps: number; date: string; perDate: Map<string, number> }>();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const name = ex.name.trim();
      if (!name) continue;
      let dayMax = 0;
      for (const s of ex.sets) {
        const weight = s.weight ?? 0;
        const reps = s.reps ?? 0;
        if (weight <= 0 || reps <= 0) continue;
        const r = est1RM(weight, reps);
        const cur = acc.get(name) ?? { best1RM: 0, weight: 0, reps: 0, date: w.date, perDate: new Map<string, number>() };
        if (r > cur.best1RM) {
          cur.best1RM = r;
          cur.weight = weight;
          cur.reps = reps;
          cur.date = w.date;
        }
        dayMax = Math.max(dayMax, r);
        acc.set(name, cur);
      }
      if (dayMax > 0) {
        const cur = acc.get(name)!;
        cur.perDate.set(w.date, Math.max(cur.perDate.get(w.date) ?? 0, dayMax));
      }
    }
  }
  const out: PersonalRecord[] = [];
  for (const [name, v] of acc) {
    if (v.best1RM <= 0) continue;
    const dates = [...v.perDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const last = dates[dates.length - 1];
    const prior = Math.max(0, ...dates.slice(0, -1).map((d) => d[1]));
    const isNew = dates.length >= 2 && last[1] > prior && last[1] === v.best1RM;
    out.push({ name, best1RM: v.best1RM, weight: v.weight, reps: v.reps, date: v.date, isNew });
  }
  return out.sort((a, b) => b.best1RM - a.best1RM);
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
