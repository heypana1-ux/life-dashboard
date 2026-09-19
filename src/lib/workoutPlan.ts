import { Exercise, PlanExercise, Workout, WorkoutPlan } from "./types";
import { isTimeBased } from "./exercises";
import { setIsLogged, setLoadKg, setSeconds } from "./trainingStats";
import { fmtShort } from "./date";

/*
  Turning a session you already did into a plan you can repeat.

  The point is the workout you improvised: you started empty because you had no time to set
  anything up, it turned out well, and now you want it back next week without retyping it.
*/

/** The targets a plan line carries, taken from what the session actually was. */
function planLine(ex: Exercise): PlanExercise | null {
  const name = ex.name.trim();
  const sets = ex.sets.filter((s) => setIsLogged(name, s));
  if (!name || sets.length === 0) return null;
  const timed = isTimeBased(name);
  // The heaviest set is the one worth aiming at again; for a hold, the longest.
  const best = sets.reduce((m, s) => (timed
    ? setSeconds(name, s) > setSeconds(name, m) ? s : m
    : setLoadKg(s) > setLoadKg(m) ? s : m));
  return {
    name,
    muscle: ex.muscle,
    sets: sets.length,
    // A held exercise has no reps, so its target is the seconds — the runner reads the unit
    // off the exercise itself, the same way it does when logging.
    targetReps: timed ? setSeconds(name, best) : (best.reps ?? undefined),
    targetWeight: timed ? undefined : (best.weight ?? undefined) || undefined,
  };
}

/** True when there is anything in this workout worth keeping as a template. */
export function canBecomePlan(w: Workout): boolean {
  return w.exercises.some((ex) => planLine(ex) !== null);
}

/** Build a plan from a logged workout. Exercises with no logged set are left out. */
export function planFromWorkout(w: Workout, name?: string): Omit<WorkoutPlan, "id" | "createdAt"> {
  return {
    name: (name ?? "").trim() || `${w.sport} · ${fmtShort(w.date)}`,
    exercises: w.exercises.map(planLine).filter((l): l is PlanExercise => l !== null),
  };
}
