"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Plus, Timer, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/defaults";
import { useT } from "@/lib/i18n";
import { Workout, WorkoutPlan } from "@/lib/types";
import { isBodyweight, isTimeBased, muscleFor, Muscle } from "@/lib/exercises";
import { todayISO } from "@/lib/date";
import { elapsedSec, fmtClock, useLive } from "@/lib/liveActivity";
import { describeSet } from "@/lib/trainingStats";
import { Button, ScaleInput } from "@/components/ui";
import { WorkoutImageAction } from "@/components/WorkoutShare";
import { ExerciseSelect } from "@/components/ExercisePicker";

/*
  A live, guided strength session — the "Start" mode. Build the workout as blocks: log a set,
  then start a rest timer or move on / add the next exercise. On finish it saves a normal
  Workout so all the existing stats & records still apply.

  The session itself is a *live activity* (see lib/liveActivity): every change is written to
  its persisted payload and the clock is derived from timestamps. So leaving this screen —
  by tapping away, swiping to another page, or closing the app — never ends the workout. It
  keeps running and the floating bar brings you straight back.
*/

interface RunSet {
  /** Added load only (plates, belt, vest) — a bodyweight exercise keeps the body part apart. */
  weight: number;
  reps: number;
  /** Seconds held, for time-based exercises. */
  seconds?: number;
  /** Body weight at the moment the set was logged, for bodyweight exercises. */
  bodyWeightKg?: number;
}
export interface RunExercise {
  id: string;
  name: string;
  muscle?: Muscle;
  targetReps?: number;
  targetWeight?: number;
  restSec?: number;
  sets: RunSet[];
}

/** Everything the runner needs to rebuild itself after a reload.
 *  `mode` separates the two live workout shapes: this guided runner, and the plain session
 *  clock inside the log form (a run, a ride) — both live, but restored by different screens. */
interface WorkoutPayload {
  mode?: "guided" | "form";
  exercises: RunExercise[];
  cur: number;
  /** Epoch ms when the running rest countdown ends. Absent when not resting. */
  restEndsAt?: number;
  phase?: "run" | "review";
  intensity?: number;
  performance?: number;
  fun?: number;
}

const REST_PRESETS = [60, 90, 120, 180];

/** Starts a guided strength session from a plan (or from scratch). */
export function useStartWorkout() {
  const { start } = useLive();
  return useCallback(
    (plan?: WorkoutPlan) => {
      const exercises: RunExercise[] = (plan?.exercises ?? []).map((pe) => ({
        id: uid("rex"),
        name: pe.name,
        muscle: (pe.name ? muscleFor(pe.name) : undefined) as Muscle | undefined,
        targetReps: pe.targetReps,
        targetWeight: pe.targetWeight,
        restSec: pe.restSec,
        sets: [],
      }));
      start({
        kind: "workout",
        label: plan?.name || undefined,
        payload: { mode: "guided", exercises, cur: 0, phase: "run" } satisfies WorkoutPayload,
      });
    },
    [start],
  );
}

/**
 * The full-screen runner. Rendered by the app shell (not by a page), so it survives
 * navigation; it shows itself whenever a workout session is live and not minimized.
 */
export function WorkoutRunner() {
  const { data, saveWorkout } = useStore();
  const { live, now, patch, patchPayload, stop } = useLive();
  const t = useT();

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [secs, setSecs] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Latest weigh-in: what a bodyweight set actually moves. Without one we just record the
  // added load, and the set still counts — it simply can't know the body part.
  const bodyWeight = data.weight.length ? data.weight[data.weight.length - 1].kg : undefined;

  const isWorkout = live?.kind === "workout" && (live.payload as WorkoutPayload | undefined)?.mode !== "form";
  const p = (isWorkout ? live!.payload : undefined) as WorkoutPayload | undefined;
  const exercises = useMemo(() => p?.exercises ?? [], [p]);
  const cur = Math.min(p?.cur ?? 0, Math.max(0, exercises.length - 1));
  const phase = p?.phase ?? "run";
  const active = exercises[cur];

  // Last logged set per exercise (across all history) → suggested weight/reps.
  const lastSet = useMemo(() => {
    const m = new Map<string, RunSet>();
    for (const w of [...data.workouts].sort((a, b) => (a.date < b.date ? -1 : 1))) {
      for (const ex of w.exercises) {
        const done = ex.sets.filter((s) => (s.reps ?? 0) > 0 || (s.seconds ?? 0) > 0);
        const last = done[done.length - 1];
        if (last)
          m.set(ex.name.toLowerCase(), {
            weight: last.weight ?? 0,
            reps: last.reps ?? 0,
            seconds: last.seconds ?? (isTimeBased(ex.name) ? last.reps : undefined),
            bodyWeightKg: last.bodyWeightKg,
          });
      }
    }
    return m;
  }, [data.workouts]);

  const timed = !!curNameOf(active) && isTimeBased(curNameOf(active)!);
  const bodyw = !!curNameOf(active) && isBodyweight(curNameOf(active)!);

  // Suggest last time's numbers when moving to an exercise.
  const curName = active?.name;
  useEffect(() => {
    const ls = curName ? lastSet.get(curName.toLowerCase()) : undefined;
    /* eslint-disable react-hooks/set-state-in-effect */
    setWeight(ls ? String(ls.weight) : "");
    setReps(ls ? String(ls.reps) : "");
    setSecs(ls?.seconds != null ? String(ls.seconds) : "");
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curName]);

  const restLeft = p?.restEndsAt ? Math.max(0, Math.ceil((p.restEndsAt - now) / 1000)) : null;

  // Buzz once when a rest countdown runs out, then clear it.
  const restWas = useRef<number | null>(null);
  useEffect(() => {
    if (restWas.current !== null && restWas.current > 0 && restLeft === 0) {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
      patchPayload({ restEndsAt: undefined });
    }
    restWas.current = restLeft;
  }, [restLeft, patchPayload]);

  if (!mounted || !isWorkout || live.minimized) return null;

  const elapsed = elapsedSec(live, now);
  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);

  function setExercises(fn: (xs: RunExercise[]) => RunExercise[]) {
    patchPayload({ exercises: fn(exercises) });
  }

  function addExercise(name: string, muscle: Muscle | undefined) {
    if (!name.trim()) return;
    patchPayload({
      exercises: [...exercises, { id: uid("rex"), name: name.trim(), muscle, sets: [] }],
      cur: exercises.length,
    });
  }

  function logSet() {
    if (!active) return;
    const added = Number(weight) || 0;
    const r = Number(reps) || 0;
    const sec = Number(secs) || 0;
    // A timed set needs seconds; everything else needs reps.
    if (timed ? sec <= 0 : r <= 0) return;
    const set: RunSet = {
      weight: added,
      reps: timed ? 0 : r,
      ...(timed ? { seconds: sec } : {}),
      // Captured now, so the set keeps the load it really moved even if you gain or lose.
      ...(bodyw && bodyWeight ? { bodyWeightKg: bodyWeight } : {}),
    };
    patchPayload({
      exercises: exercises.map((e, i) => (i === cur ? { ...e, sets: [...e.sets, set] } : e)),
      // Auto-start this exercise's configured rest (from the plan), if any.
      ...(active.restSec && active.restSec > 0 ? { restEndsAt: Date.now() + active.restSec * 1000 } : {}),
    });
    if (timed) setSecs("");
    else setReps("");
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((xs) => xs.map((e, i) => (i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e)));
  }

  /** The session as a Workout — used both to save it and to draw the share image. */
  function buildWorkout(): Workout {
    return {
      id: "",
      date: todayISO(),
      sport: "Strength Training",
      durationMin: Math.max(1, Math.round(elapsed / 60)),
      intensity: p?.intensity ?? 7,
      performance: p?.performance ?? 7,
      fun: p?.fun ?? 7,
      exercises: exercises
        .filter((e) => e.sets.length > 0)
        .map((e) => ({
          id: uid("ex"),
          name: e.name,
          muscle: e.muscle,
          sets: e.sets.map((s) => ({
            reps: s.reps,
            weight: s.weight,
            ...(s.seconds != null ? { seconds: s.seconds } : {}),
            ...(s.bodyWeightKg != null ? { bodyWeightKg: s.bodyWeightKg } : {}),
          })),
        })),
    };
  }

  function doSave() {
    saveWorkout(buildWorkout());
    stop();
  }

  /** Leaves the screen but keeps the workout running — the floating bar brings it back. */
  const minimize = () => patch({ minimized: true });

  // Review step: rate the session so it feeds the score, stats and the AI.
  if (phase === "review") {
    return createPortal(
      <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--bg)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <button
            onClick={() => patchPayload({ phase: "run" })}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {t("Back")}
          </button>
          <span className="text-sm font-semibold">{t("How was it?")}</span>
          <span className="w-10" />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="tile flex items-center justify-between p-4">
              <span className="text-sm text-[var(--text-muted)]">{t("Duration")}</span>
              <span className="num text-lg font-bold">
                {fmtClock(elapsed)} · {totalSets} {t("sets")}
              </span>
            </div>
            {(
              [
                [t("Intensity"), p?.intensity ?? 7, "intensity"],
                [t("Performance"), p?.performance ?? 7, "performance"],
                [t("Fun"), p?.fun ?? 7, "fun"],
              ] as const
            ).map(([label, val, key]) => (
              <div key={key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm font-semibold text-[var(--accent)]">{val}/10</span>
                </div>
                <ScaleInput value={val} onChange={(n) => patchPayload({ [key]: n })} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2 border-t border-[var(--border)] p-4">
          {/* The card is drawn from the session as it stands, so you can look at it — and
              adjust the ratings — before the workout is filed away. */}
          <div className="mx-auto w-full max-w-md">
            <WorkoutImageAction build={buildWorkout} />
          </div>
          <Button className="mx-auto block w-full max-w-md !py-3" onClick={doSave}>
            <Check size={16} /> {t("Save workout")}
          </Button>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--bg)]">
      {/* Header — the chevron only hides the screen; the session keeps running. */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <button
          onClick={minimize}
          className="flex items-center gap-1 text-[var(--text-faint)] hover:text-[var(--text)]"
          aria-label={t("Keep running in the background")}
          title={t("Keep running in the background")}
        >
          <ChevronDown size={20} />
        </button>
        <div className="flex items-center gap-2 tabular-nums">
          <Timer size={16} className="text-[var(--accent)]" />
          <span className="text-lg font-bold">{fmtClock(elapsed)}</span>
          <span className="text-xs text-[var(--text-faint)]">
            · {totalSets} {t("sets")}
          </span>
        </div>
        <Button size="sm" onClick={() => patchPayload({ phase: "review" })} disabled={totalSets === 0}>
          <Check size={15} /> {t("Finish")}
        </Button>
      </div>

      {/* Rest countdown */}
      {restLeft != null && restLeft > 0 && (
        <div className="flex items-center justify-between gap-3 bg-[var(--accent-soft)] px-4 py-3">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Timer size={18} />
            <span className="text-sm font-medium">{t("Rest")}</span>
            <span className="num text-2xl font-bold tabular-nums">{fmtClock(restLeft)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => patchPayload({ restEndsAt: (p?.restEndsAt ?? Date.now()) + 30000 })}
              className="rounded-lg bg-[var(--surface)] px-3 py-1.5 text-sm font-medium"
            >
              +30s
            </button>
            <button
              onClick={() => patchPayload({ restEndsAt: undefined })}
              className="rounded-lg bg-[var(--surface)] px-3 py-1.5 text-sm font-medium"
            >
              {t("Skip")}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-md space-y-4">
          {exercises.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
              <p className="mb-3 text-sm text-[var(--text-muted)]">{t("Add your first exercise to begin.")}</p>
              <ExerciseSelect value="" onChange={addExercise} placeholder={t("Choose exercise")} />
            </div>
          ) : (
            <>
              {/* Exercise switcher */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => patchPayload({ cur: Math.max(0, cur - 1) })}
                  disabled={cur === 0}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="min-w-0 flex-1 text-center">
                  <div className="truncate text-lg font-semibold">{active?.name}</div>
                  <div className="text-xs text-[var(--text-faint)]">
                    {t("Exercise")} {cur + 1}/{exercises.length}
                    {active?.targetWeight || active?.targetReps
                      ? ` · ${t("target")} ${active?.targetWeight ?? "—"}kg×${active?.targetReps ?? "—"}`
                      : ""}
                  </div>
                </div>
                <button
                  onClick={() => patchPayload({ cur: Math.min(exercises.length - 1, cur + 1) })}
                  disabled={cur >= exercises.length - 1}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Logged sets */}
              <div className="space-y-1.5">
                {active?.sets.map((s, j) => (
                  <div key={j} className="flex items-center gap-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm">
                    <span className="text-[var(--text-faint)]">{j + 1}</span>
                    <span className="flex-1 font-medium tabular-nums">{describeSet(active.name, s, t)}</span>
                    <button onClick={() => removeSet(cur, j)} className="text-[var(--text-faint)] hover:text-[var(--bad)]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Log a set */}
              <div className="flex items-end gap-2">
                <label className="flex-1 text-xs font-medium text-[var(--text-muted)]">
                  {/* A bodyweight exercise already carries your own weight, so this field is
                      the load you ADD on top; everything else asks for the plain weight. */}
                  {bodyw ? `+ ${t("Weight (kg)")}` : t("Weight (kg)")}
                  <input
                    type="number"
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder={bodyw ? "0" : active?.targetWeight ? String(active.targetWeight) : ""}
                  />
                </label>
                <label className="flex-1 text-xs font-medium text-[var(--text-muted)]">
                  {timed ? t("Seconds") : t("Reps")}
                  <input
                    type="number"
                    inputMode="numeric"
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
                    value={timed ? secs : reps}
                    onChange={(e) => (timed ? setSecs(e.target.value) : setReps(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") logSet();
                    }}
                    placeholder={timed ? "60" : active?.targetReps ? String(active.targetReps) : ""}
                  />
                </label>
                <Button onClick={logSet} disabled={timed ? !secs : !reps}>
                  <Plus size={16} /> {t("Log set")}
                </Button>
              </div>

              {bodyw && (
                <p className="-mt-2 text-[11px] text-[var(--text-faint)]">
                  {bodyWeight
                    ? t("Bodyweight exercise — your {kg} kg counts as the load.", { kg: bodyWeight })
                    : t("Bodyweight exercise — log a weigh-in to have your body weight counted.")}
                </p>
              )}

              {/* Rest */}
              <div>
                <div className="mb-1.5 text-xs font-medium text-[var(--text-faint)]">{t("Start rest")}</div>
                <div className="flex flex-wrap gap-2">
                  {REST_PRESETS.map((sec) => (
                    <button
                      key={sec}
                      onClick={() => patchPayload({ restEndsAt: Date.now() + sec * 1000 })}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-medium hover:border-[var(--accent)]"
                    >
                      {fmtClock(sec)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add another exercise */}
              <div className="border-t border-[var(--border)] pt-3">
                <div className="mb-1.5 text-xs font-medium text-[var(--text-faint)]">{t("Add exercise")}</div>
                <ExerciseSelect value="" onChange={addExercise} placeholder={t("Choose exercise")} />
              </div>
            </>
          )}

          {/* Ending the session for real is deliberate — closing the screen never is. */}
          <div className="border-t border-[var(--border)] pt-3 text-center">
            {confirmDiscard ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">{t("Discard this workout without saving?")}</span>
                <Button variant="danger" size="sm" onClick={stop}>
                  {t("Discard")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(false)}>
                  {t("Cancel")}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDiscard(true)}
                className="text-xs text-[var(--text-faint)] hover:text-[var(--bad)]"
              >
                {t("Discard workout")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function curNameOf(ex: RunExercise | undefined): string | undefined {
  return ex?.name;
}

