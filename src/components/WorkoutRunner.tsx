"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Plus, Timer, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/defaults";
import { useT } from "@/lib/i18n";
import { Workout, WorkoutPlan } from "@/lib/types";
import { muscleFor, Muscle } from "@/lib/exercises";
import { todayISO } from "@/lib/date";
import { Button } from "@/components/ui";
import { ExerciseSelect } from "@/components/ExercisePicker";

/*
  A live, guided strength session — the "Start" mode. Build the workout as blocks: log a set,
  then start a rest timer or move on / add the next exercise. A session clock runs throughout;
  on finish it saves a normal Workout so all the existing stats & records still apply.
*/

interface RunSet {
  weight: number;
  reps: number;
}
interface RunExercise {
  id: string;
  name: string;
  muscle?: Muscle;
  targetReps?: number;
  targetWeight?: number;
  sets: RunSet[];
}

const REST_PRESETS = [60, 90, 120, 180];

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutRunner({ plan, onClose }: { plan?: WorkoutPlan; onClose: () => void }) {
  const { saveWorkout } = useStore();
  const t = useT();

  const initial = useMemo<RunExercise[]>(
    () =>
      (plan?.exercises ?? []).map((pe) => ({
        id: uid("rex"),
        name: pe.name,
        muscle: (pe.name ? muscleFor(pe.name) : undefined) as Muscle | undefined,
        targetReps: pe.targetReps,
        targetWeight: pe.targetWeight,
        sets: [],
      })),
    [plan],
  );

  const [exercises, setExercises] = useState<RunExercise[]>(initial);
  const [cur, setCur] = useState(0);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // One-second heartbeat: advance the session clock and count down any active rest.
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
      setRest((r) => {
        if (r == null) return r;
        if (r <= 1) {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
          return null;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const active = exercises[cur];

  function addExercise(name: string, muscle: Muscle | undefined) {
    if (!name.trim()) return;
    setExercises((xs) => [...xs, { id: uid("rex"), name: name.trim(), muscle, sets: [] }]);
    setCur(exercises.length); // new item lands at the current length
  }

  function logSet() {
    const w = Number(weight) || 0;
    const r = Number(reps) || 0;
    if (r <= 0 || !active) return;
    setExercises((xs) => xs.map((e, i) => (i === cur ? { ...e, sets: [...e.sets, { weight: w, reps: r }] } : e)));
    setReps("");
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((xs) => xs.map((e, i) => (i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e)));
  }

  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);

  function finish() {
    const w: Workout = {
      id: "",
      date: todayISO(),
      sport: "Strength Training",
      durationMin: Math.max(1, Math.round(elapsed / 60)),
      intensity: 7,
      performance: 7,
      fun: 7,
      exercises: exercises
        .filter((e) => e.sets.length > 0)
        .map((e) => ({ id: uid("ex"), name: e.name, muscle: e.muscle, sets: e.sets.map((s) => ({ reps: s.reps, weight: s.weight })) })),
    };
    saveWorkout(w);
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--bg)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <button onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text)]" aria-label={t("Close")}>
          <X size={20} />
        </button>
        <div className="flex items-center gap-2 tabular-nums">
          <Timer size={16} className="text-[var(--accent)]" />
          <span className="text-lg font-bold">{fmtClock(elapsed)}</span>
          <span className="text-xs text-[var(--text-faint)]">· {totalSets} {t("sets")}</span>
        </div>
        <Button size="sm" onClick={finish}>
          <Check size={15} /> {t("Finish")}
        </Button>
      </div>

      {/* Rest countdown */}
      {rest != null && (
        <div className="flex items-center justify-between gap-3 bg-[var(--accent-soft)] px-4 py-3">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Timer size={18} />
            <span className="text-sm font-medium">{t("Rest")}</span>
            <span className="num text-2xl font-bold tabular-nums">{fmtClock(rest)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRest((r) => (r ?? 0) + 30)} className="rounded-lg bg-[var(--surface)] px-3 py-1.5 text-sm font-medium">+30s</button>
            <button onClick={() => setRest(null)} className="rounded-lg bg-[var(--surface)] px-3 py-1.5 text-sm font-medium">{t("Skip")}</button>
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
                  onClick={() => setCur((c) => Math.max(0, c - 1))}
                  disabled={cur === 0}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="min-w-0 flex-1 text-center">
                  <div className="truncate text-lg font-semibold">{active?.name}</div>
                  <div className="text-xs text-[var(--text-faint)]">
                    {t("Exercise")} {cur + 1}/{exercises.length}
                    {active?.targetWeight || active?.targetReps ? ` · ${t("target")} ${active?.targetWeight ?? "—"}kg×${active?.targetReps ?? "—"}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => setCur((c) => Math.min(exercises.length - 1, c + 1))}
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
                    <span className="flex-1 font-medium tabular-nums">{s.weight} kg × {s.reps}</span>
                    <button onClick={() => removeSet(cur, j)} className="text-[var(--text-faint)] hover:text-[var(--bad)]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Log a set */}
              <div className="flex items-end gap-2">
                <label className="flex-1 text-xs font-medium text-[var(--text-muted)]">
                  {t("Weight (kg)")}
                  <input type="number" inputMode="decimal" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={active?.targetWeight ? String(active.targetWeight) : ""} />
                </label>
                <label className="flex-1 text-xs font-medium text-[var(--text-muted)]">
                  {t("Reps")}
                  <input type="number" inputMode="numeric" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]" value={reps} onChange={(e) => setReps(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") logSet(); }} placeholder={active?.targetReps ? String(active.targetReps) : ""} />
                </label>
                <Button onClick={logSet} disabled={!reps}>
                  <Plus size={16} /> {t("Log set")}
                </Button>
              </div>

              {/* Rest */}
              <div>
                <div className="mb-1.5 text-xs font-medium text-[var(--text-faint)]">{t("Start rest")}</div>
                <div className="flex flex-wrap gap-2">
                  {REST_PRESETS.map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setRest(sec)}
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
        </div>
      </div>
    </div>,
    document.body,
  );
}
