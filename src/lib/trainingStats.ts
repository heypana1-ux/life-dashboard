import { ExerciseSet, Workout } from "./types";
import { isTimeBased, muscleFor } from "./exercises";
import { todayISO, addDays } from "./date";

/*
  Strength-training analytics derived from logged workouts:
   - per-exercise progression (best set weight and estimated 1RM over time)
   - per-muscle-group training volume (tonnage = reps × weight, summed)
*/

/**
 * The load a set actually moved, in kg.
 *
 * A bodyweight exercise stores only the ADDED kg in `weight` and the body weight it moved in
 * `bodyWeightKg`, so a weighted pull-up at +10 with an 80 kg athlete is 90 kg of work — and
 * stays 90 even after that athlete's weight changes. Everything else is just the bar.
 */
export function setLoadKg(s: ExerciseSet): number {
  return (s.weight ?? 0) + (s.bodyWeightKg ?? 0);
}

/**
 * Seconds held by a set of a time-based exercise.
 *
 * Before the app knew about held exercises, a 60-second plank was logged the only way it
 * could be: 0 kg × 60 "reps". `migrateTimedSets` converts those on load, but this reader
 * still understands the old shape — data can reach a stat from a sync or an import without
 * having passed through that migration first.
 */
export function setSeconds(exerciseName: string, s: ExerciseSet): number {
  if (s.seconds != null) return s.seconds;
  if (isTimeBased(exerciseName)) return s.reps ?? 0;
  return 0;
}

/**
 * Estimated one-rep max for a set (Epley).
 *
 * Two corrections over the bare formula:
 *  - A single rep IS the max, so it's returned as-is. Plain Epley would inflate a logged
 *    70 kg × 1 to 72 kg, which then shows up as a personal record you never lifted.
 *  - Reps above 12 are clamped. Every e1RM formula assumes a set taken close to failure and
 *    breaks down over ~12 reps, where it starts predicting maxes far above what you can lift.
 *
 * It still can only read the set it's given: a comfortable 40 kg × 10 estimates ~53 kg,
 * because that's what ten easy reps imply. To record a real max, log the single itself.
 */
export function est1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(weight);
  return Math.round(weight * (1 + Math.min(reps, 12) / 30));
}

/**
 * Rewrites old held sets into real seconds.
 *
 * Before the app knew about held exercises, a 60-second plank had to be logged as 0 kg × 60
 * "reps". `setSeconds` reads those correctly, but the raw number stays wrong everywhere the
 * data itself is used — an export, the AI's view of a session, a future feature. So on load
 * they are converted once: reps become seconds, and the set is left alone from then on
 * (`seconds` is already set, so re-running this changes nothing).
 */
export function migrateTimedSets(workouts: Workout[]): Workout[] {
  let touched = false;
  const out = workouts.map((w) => {
    let wTouched = false;
    const exercises = w.exercises.map((ex) => {
      if (!isTimeBased(ex.name)) return ex;
      if (!ex.sets.some((s) => s.seconds == null && (s.reps ?? 0) > 0)) return ex;
      wTouched = true;
      return {
        ...ex,
        sets: ex.sets.map((s) => (s.seconds == null && (s.reps ?? 0) > 0 ? { ...s, seconds: s.reps, reps: 0 } : s)),
      };
    });
    if (!wTouched) return w;
    touched = true;
    return { ...w, exercises };
  });
  return touched ? out : workouts;
}

/**
 * One line that describes any set, whatever it was: "80 kg × 8", "78 + 10 kg × 6", "45 s".
 *
 * Lives here rather than in a component because the runner, the log and the share image all
 * have to say the same thing about the same set.
 */
export function describeSet(
  exerciseName: string,
  s: ExerciseSet,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  const sec = setSeconds(exerciseName, s);
  if (sec > 0 && (s.seconds != null || isTimeBased(exerciseName))) return `${sec} s`;
  const reps = s.reps ?? 0;
  const body = s.bodyWeightKg ?? 0;
  const added = s.weight ?? 0;
  if (body > 0) return `${added > 0 ? `${body} + ${added}` : body} kg × ${reps}`;
  if (added > 0) return `${added} kg × ${reps}`;
  return t("{n} reps", { n: reps });
}

/** How good a set was, for picking the one to highlight. Seconds for holds, e1RM otherwise. */
export function setScore(exerciseName: string, s: ExerciseSet): number {
  if (isTimeBased(exerciseName)) return setSeconds(exerciseName, s);
  return est1RM(setLoadKg(s), s.reps ?? 0) || setLoadKg(s);
}

/** True once a set carries anything worth showing — used to skip untouched rows. */
export function setIsLogged(exerciseName: string, s: ExerciseSet): boolean {
  return setSeconds(exerciseName, s) > 0 || (s.reps ?? 0) > 0 || (s.weight ?? 0) > 0;
}

export interface ExercisePoint {
  date: string;
  bestWeight: number;
  best1RM: number;
  volume: number;
  /** Longest hold that day, for time-based exercises. 0 for everything else. */
  bestSeconds: number;
  /** Total seconds held that day, the time equivalent of tonnage. */
  totalSeconds: number;
}

/** Distinct exercise names that have at least one real set — weight, reps or seconds. */
export function loggedExerciseNames(workouts: Workout[]): string[] {
  const names = new Set<string>();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const name = ex.name.trim();
      if (name && ex.sets.some((s) => setIsLogged(name, s))) names.add(name);
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
    let bestSeconds = 0;
    let totalSeconds = 0;
    let found = false;
    for (const ex of w.exercises) {
      if (ex.name.trim().toLowerCase() !== key) continue;
      found = true;
      const timed = isTimeBased(ex.name);
      for (const s of ex.sets) {
        if (timed) {
          const sec = setSeconds(ex.name, s);
          bestSeconds = Math.max(bestSeconds, sec);
          totalSeconds += sec;
          continue;
        }
        const weight = setLoadKg(s);
        const reps = s.reps ?? 0;
        if (weight > bestWeight) bestWeight = weight;
        best1RM = Math.max(best1RM, est1RM(weight, reps));
        volume += weight * reps;
      }
    }
    if (found)
      points.push({
        date: w.date,
        bestWeight,
        best1RM,
        volume: Math.round(volume),
        bestSeconds,
        totalSeconds,
      });
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
      // Time-based work has no one-rep max — a plank PR is a longer hold, tracked separately.
      if (isTimeBased(name)) continue;
      for (const s of ex.sets) {
        const weight = setLoadKg(s);
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
  /** Seconds held, for muscles trained with planks and the like. */
  seconds: number;
}

/** Total tonnage + set count per muscle group over the last `days` days. */
export function muscleVolume(workouts: Workout[], days = 30): MuscleVolume[] {
  const since = addDays(todayISO(), -(days - 1));
  const agg = new Map<string, { volume: number; sets: number; seconds: number }>();
  for (const w of workouts) {
    if (w.date < since) continue;
    for (const ex of w.exercises) {
      const muscle = ex.muscle || muscleFor(ex.name) || "other";
      const cur = agg.get(muscle) ?? { volume: 0, sets: 0, seconds: 0 };
      const timed = isTimeBased(ex.name);
      for (const s of ex.sets) {
        if (timed) {
          // A held set is still a set for this muscle, but seconds aren't tonnage — counting
          // them as kg×reps would make a 60 s plank look like a 60 kg lift.
          const sec = setSeconds(ex.name, s);
          if (sec > 0) {
            cur.sets += 1;
            cur.seconds += sec;
          }
          continue;
        }
        const weight = setLoadKg(s);
        const reps = s.reps ?? 0;
        if (weight > 0 || reps > 0) cur.sets += 1;
        cur.volume += weight * reps;
      }
      agg.set(muscle, cur);
    }
  }
  return [...agg.entries()]
    // An exercise row you added but never filled leaves an empty muscle behind — don't list it.
    .filter(([, v]) => v.sets > 0)
    .map(([muscle, v]) => ({ muscle, volume: Math.round(v.volume), sets: v.sets, seconds: v.seconds }))
    .sort((a, b) => b.volume - a.volume || b.seconds - a.seconds);
}

export interface HoldRecord {
  name: string;
  seconds: number;
  date: string;
  isNew: boolean;
}

/** Longest hold per time-based exercise — the "personal record" a plank actually has. */
export function holdRecords(workouts: Workout[]): HoldRecord[] {
  const acc = new Map<string, { seconds: number; date: string; perDate: Map<string, number> }>();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const name = ex.name.trim();
      if (!name || !isTimeBased(name)) continue;
      const cur = acc.get(name) ?? { seconds: 0, date: w.date, perDate: new Map<string, number>() };
      let dayMax = 0;
      for (const s of ex.sets) {
        const sec = setSeconds(name, s);
        if (sec <= 0) continue;
        dayMax = Math.max(dayMax, sec);
        if (sec > cur.seconds) {
          cur.seconds = sec;
          cur.date = w.date;
        }
      }
      if (dayMax > 0) cur.perDate.set(w.date, Math.max(cur.perDate.get(w.date) ?? 0, dayMax));
      acc.set(name, cur);
    }
  }
  const out: HoldRecord[] = [];
  for (const [name, v] of acc) {
    if (v.seconds <= 0) continue;
    const dates = [...v.perDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const last = dates[dates.length - 1];
    const prior = Math.max(0, ...dates.slice(0, -1).map((d) => d[1]));
    out.push({
      name,
      seconds: v.seconds,
      date: v.date,
      isNew: dates.length >= 2 && last[1] > prior && last[1] === v.seconds,
    });
  }
  return out.sort((a, b) => b.seconds - a.seconds);
}
