"use client";

import { useState } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Workout } from "@/lib/types";
import { canBecomePlan, planFromWorkout } from "@/lib/workoutPlan";
import { Button, Modal, inputCls } from "@/components/ui";

/*
  Keep a session you improvised.

  You start an empty workout because there was no time to set one up, it turns out to be a good
  session, and then it's gone. This turns what you actually did into a plan you can start again
  with one tap — the sets and the heaviest load of each exercise become its targets.
*/

function SaveDialog({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const { savePlan } = useStore();
  const t = useT();
  const draft = planFromWorkout(workout);
  const [name, setName] = useState(draft.name);
  const [saved, setSaved] = useState(false);

  function save() {
    const plan = planFromWorkout(workout, name);
    savePlan({ id: "", name: plan.name, exercises: plan.exercises, createdAt: new Date().toISOString() });
    setSaved(true);
    setTimeout(onClose, 700);
  }

  return (
    <Modal open onClose={onClose} title={t("Save as plan")}>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text-muted)]">
          {t("Plan name")}
          <input className={`${inputCls} mt-1`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
            {draft.exercises.length} {t("Exercises")}
          </div>
          <ul className="space-y-1 text-[12.5px]">
            {draft.exercises.map((ex) => (
              <li key={ex.name} className="flex items-baseline justify-between gap-3">
                <span className="truncate">{ex.name}</span>
                <span className="num shrink-0 text-[var(--text-faint)]">
                  {ex.sets} × {ex.targetReps ?? "—"}
                  {ex.targetWeight ? ` · ${ex.targetWeight} kg` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Button className="w-full" onClick={save} disabled={saved || draft.exercises.length === 0}>
          {saved ? <><Check size={16} /> {t("Saved ✓")}</> : <><BookmarkPlus size={16} /> {t("Save as plan")}</>}
        </Button>
      </div>
    </Modal>
  );
}

/** Icon-sized trigger for a row in the workout list. */
export function SavePlanButton({ workout }: { workout: Workout }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!canBecomePlan(workout)) return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("Save as plan")}
        title={t("Save as plan")}
        className="rounded-lg p-1.5 text-[var(--text-faint)] hover:text-[var(--accent)]"
      >
        <BookmarkPlus size={14} />
      </button>
      {open && <SaveDialog workout={workout} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Full-width trigger for the end of a session. `build` runs once, on tap. */
export function SavePlanAction({ build }: { build: () => Workout }) {
  const t = useT();
  const [shot, setShot] = useState<Workout | null>(null);
  return (
    <>
      <Button variant="soft" className="w-full" onClick={() => setShot(build())}>
        <BookmarkPlus size={16} /> {t("Save as plan")}
      </Button>
      {shot && <SaveDialog workout={shot} onClose={() => setShot(null)} />}
    </>
  );
}
