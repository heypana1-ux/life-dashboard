import { Workout } from "./types";
import { isBodyweight, isTimeBased, muscleFor } from "./exercises";
import { est1RM, setIsLogged, setLoadKg, setSeconds } from "./trainingStats";

/*
  What to aim for the next time you do an exercise, derived from what you actually did.

  The rule is the one every beginner-to-intermediate program uses and nothing cleverer: if you
  hit your reps on every working set, add a little weight; if you didn't, repeat it; and if the
  lift has gone nowhere for three sessions and the last one was worse than the two before, back
  off ten percent and build it up again. It is a suggestion, not a prescription — the field is
  pre-filled and you can type over it.
*/

export type ProgressionKind = "progress" | "hold" | "deload";

export interface SessionSummary {
  date: string;
  /** Working sets that were actually logged. */
  sets: number;
  /** The best set of that day: heaviest by estimated 1RM, or the longest hold. */
  weight: number;
  /** Just the plates, for a bodyweight exercise — that's the part a suggestion can move. */
  added: number;
  reps: number;
  seconds: number;
  /** Estimated 1RM of the best set — the yardstick for "did this move?". */
  e1rm: number;
  /** True if every logged set reached the day's own top rep count. */
  allSetsHit: boolean;
}

export interface Progression {
  kind: ProgressionKind;
  /** Added load for a bodyweight exercise, absolute weight otherwise. */
  weight: number;
  reps: number;
  /** Set for held exercises (plank & co.) instead of reps. */
  seconds?: number;
  sets: number;
  /** How far the weight moves versus last time, in kg. 0 for a repeat. */
  step: number;
  last: SessionSummary;
  /** Number of sessions in a row without a new best — what triggers a deload at 3. */
  stalledSessions: number;
}

/** Legs and back move in bigger jumps than arms and shoulders. */
function stepFor(exerciseName: string): number {
  const m = muscleFor(exerciseName);
  return m === "quads" || m === "hamstrings" || m === "glutes" || m === "back" ? 5 : 2.5;
}

/** One entry per day you trained the exercise, oldest first. */
export function exerciseSessions(workouts: Workout[], name: string): SessionSummary[] {
  const key = name.trim().toLowerCase();
  const out: SessionSummary[] = [];
  for (const w of workouts) {
    let sets = 0;
    let best: { weight: number; added: number; reps: number; seconds: number; e1rm: number } | null = null;
    let topReps = 0;
    const repsPerSet: number[] = [];
    for (const ex of w.exercises) {
      if (ex.name.trim().toLowerCase() !== key) continue;
      for (const s of ex.sets) {
        if (!setIsLogged(ex.name, s)) continue;
        sets += 1;
        const seconds = setSeconds(ex.name, s);
        const weight = setLoadKg(s);
        const reps = s.reps ?? 0;
        repsPerSet.push(seconds > 0 ? seconds : reps);
        topReps = Math.max(topReps, seconds > 0 ? seconds : reps);
        const e1rm = seconds > 0 ? seconds : est1RM(weight, reps);
        if (!best || e1rm > best.e1rm) best = { weight, added: s.weight ?? 0, reps, seconds, e1rm };
      }
    }
    if (sets > 0 && best) {
      out.push({
        date: w.date,
        sets,
        weight: best.weight,
        added: best.added,
        reps: best.reps,
        seconds: best.seconds,
        e1rm: best.e1rm,
        // "Hit your reps" means the whole session held up, not just the one good set.
        allSetsHit: repsPerSet.every((r) => r >= topReps),
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * What to put on the bar next time. Null when the exercise has never been logged — there is
 * nothing to progress from, and inventing a starting weight would be a guess about a body
 * the app has never seen lift.
 */
export function suggestNext(workouts: Workout[], name: string): Progression | null {
  const sessions = exerciseSessions(workouts, name);
  if (sessions.length === 0) return null;
  const last = sessions[sessions.length - 1];
  const timed = isTimeBased(name);
  const bodyw = isBodyweight(name);

  // A stall is measured against the best you have ever done, not the last session alone.
  const bestEver = Math.max(...sessions.map((s) => s.e1rm));
  let stalled = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].e1rm >= bestEver) break;
    stalled += 1;
  }

  if (timed) {
    const secs = last.seconds || last.reps;
    if (stalled >= 3) {
      return { kind: "deload", weight: 0, reps: 0, seconds: Math.max(10, Math.round(secs * 0.8)), sets: last.sets, step: 0, last, stalledSessions: stalled };
    }
    return {
      kind: last.allSetsHit ? "progress" : "hold",
      weight: 0,
      reps: 0,
      seconds: last.allSetsHit ? secs + 5 : secs,
      sets: last.sets,
      step: 0,
      last,
      stalledSessions: stalled,
    };
  }

  // A bodyweight exercise stores only the added load, so that's the number to move.
  const current = bodyw ? last.added : last.weight;
  const step = stepFor(name);

  if (stalled >= 3) {
    // Ten percent off, rounded down to something you can actually load on a bar.
    const dropped = Math.max(0, Math.floor((current * 0.9) / step) * step);
    return { kind: "deload", weight: dropped, reps: last.reps, sets: last.sets, step: dropped - current, last, stalledSessions: stalled };
  }
  if (last.allSetsHit) {
    // A bodyweight exercise with nothing hanging off it progresses by a rep, not by a plate.
    if (bodyw && current === 0) {
      return { kind: "progress", weight: 0, reps: last.reps + 1, sets: last.sets, step: 0, last, stalledSessions: stalled };
    }
    return { kind: "progress", weight: current + step, reps: last.reps, sets: last.sets, step, last, stalledSessions: stalled };
  }
  return { kind: "hold", weight: current, reps: last.reps, sets: last.sets, step: 0, last, stalledSessions: stalled };
}

/** Next targets for the exercises you're actually training, most recent first. */
export function nextTargets(workouts: Workout[], limit = 6): { name: string; next: Progression }[] {
  const lastSeen = new Map<string, string>();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const name = ex.name.trim();
      if (!name || !ex.sets.some((s) => setIsLogged(name, s))) continue;
      if (!lastSeen.has(name) || w.date > (lastSeen.get(name) as string)) lastSeen.set(name, w.date);
    }
  }
  return [...lastSeen.entries()]
    .sort((a, b) => (a[1] < b[1] ? 1 : -1))
    .slice(0, limit)
    .map(([name]) => ({ name, next: suggestNext(workouts, name) }))
    .filter((x): x is { name: string; next: Progression } => x.next !== null);
}
