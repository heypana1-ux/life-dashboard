"use client";

import { useMemo, useState } from "react";
import { Dumbbell, Plus, Save, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Exercise, Workout } from "@/lib/types";
import { DEFAULT_SPORTS, uid } from "@/lib/defaults";
import { fmtDuration, fmtShort, isoRange, todayISO } from "@/lib/date";
import {
  Card,
  PageHeader,
  SectionTitle,
  Button,
  Modal,
  Field,
  inputCls,
  EmptyState,
  Badge,
  ScaleInput,
} from "@/components/ui";
import { Bars } from "@/components/charts";

export default function TrainingPage() {
  const { data, removeWorkout } = useStore();
  const t = useT();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Workout | undefined>();

  const workouts = useMemo(
    () => [...data.workouts].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.workouts],
  );

  const week = isoRange(todayISO(), 7);
  const thisWeek = workouts.filter((w) => week.includes(w.date));
  const totalMin = workouts.reduce((s, w) => s + w.durationMin, 0);
  const perf = workouts.filter((w) => w.performance);
  const avgPerf = perf.length ? (perf.reduce((s, w) => s + (w.performance ?? 0), 0) / perf.length).toFixed(1) : "—";

  // weekly training minutes for the last 8 weeks
  const volume = useMemo(() => {
    const weeks: { label: string; value: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const end = todayISO();
      const start = isoRange(end, (w + 1) * 7).slice(0, 7);
      const range = new Set(start);
      const mins = data.workouts
        .filter((x) => range.has(x.date))
        .reduce((s, x) => s + x.durationMin, 0);
      weeks.push({ label: fmtShort(start[0]), value: Math.round(mins / 60) });
    }
    return weeks;
  }, [data.workouts]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Training")}
        subtitle={t("Detailed workout logging with exercises, sets and metrics.")}
        action={
          <Button onClick={() => { setEditing(undefined); setModal(true); }}>
            <Plus size={16} /> {t("Log workout")}
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label={t("Sessions this week")} value={String(thisWeek.length)} />
        <MiniStat label={t("Total time")} value={totalMin ? fmtDuration(totalMin) : "—"} />
        <MiniStat label={t("Avg performance")} value={avgPerf} />
      </div>

      {data.workouts.length > 0 && (
        <Card>
          <SectionTitle>{t("Volume")} · h / {t("week")}</SectionTitle>
          <Bars data={volume} color="var(--good)" unit="h" height={180} />
        </Card>
      )}

      <Card>
        <SectionTitle>{t("Recent workouts")}</SectionTitle>
        {workouts.length === 0 ? (
          <EmptyState
            icon={<Dumbbell size={26} />}
            title={t("No workouts yet")}
            action={
              <Button variant="soft" size="sm" onClick={() => setModal(true)}>
                <Plus size={16} /> {t("Log workout")}
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {workouts.map((w) => (
              <div key={w.id} className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{w.sport}</span>
                      <Badge>{fmtDuration(w.durationMin)}</Badge>
                      {w.performance ? <Badge tone="accent">{t("Performance")} {w.performance}/10</Badge> : null}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--text-faint)]">
                      {fmtShort(w.date)}
                      {w.distanceKm ? ` · ${w.distanceKm} km` : ""}
                      {w.avgPulse ? ` · ${w.avgPulse} bpm` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(w); setModal(true); }} className="rounded-lg px-2 py-1 text-xs text-[var(--text-faint)] hover:bg-[var(--surface-2)]">
                      {t("Edit")}
                    </button>
                    <button onClick={() => removeWorkout(w.id)} className="rounded-lg p-1.5 text-[var(--text-faint)] hover:text-[var(--bad)]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {w.exercises.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {w.exercises.map((ex) => (
                      <span key={ex.id} className="rounded-lg bg-[var(--surface-2)] px-2 py-1 text-xs">
                        {ex.name} · {ex.sets.length}×
                        {ex.sets[0]?.weight ? ` ${ex.sets[0].weight}kg` : ""}
                      </span>
                    ))}
                  </div>
                )}
                {w.notes && <p className="mt-2 text-xs text-[var(--text-muted)]">{w.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <WorkoutModal open={modal} onClose={() => setModal(false)} editing={editing} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="!p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}

function WorkoutModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Workout }) {
  const { data, saveWorkout } = useStore();
  const t = useT();
  const sports = useMemo(() => {
    const custom = data.habits.filter((h) => h.area === "sport").map((h) => h.name);
    return Array.from(new Set([...DEFAULT_SPORTS, ...custom]));
  }, [data.habits]);

  const blank: Workout = {
    id: "",
    date: todayISO(),
    sport: sports[0] ?? "Strength Training",
    durationMin: 60,
    intensity: 7,
    performance: 7,
    fun: 7,
    energyBefore: 6,
    energyAfter: 6,
    exercises: [],
  };
  const [draft, setDraft] = useState<Workout>(editing ?? blank);
  const key = editing?.id ?? "new";
  const [lk, setLk] = useState(key);
  if (open && key !== lk) {
    setLk(key);
    setDraft(editing ?? blank);
  }

  const set = (patch: Partial<Workout>) => setDraft((d) => ({ ...d, ...patch }));

  function addExercise() {
    set({ exercises: [...draft.exercises, { id: uid("ex"), name: "", sets: [{ reps: 10, weight: 0 }] }] });
  }
  function updateExercise(id: string, patch: Partial<Exercise>) {
    set({ exercises: draft.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t("Edit") : t("New workout")} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Sport")}>
            <input className={inputCls} list="sports-list" value={draft.sport} onChange={(e) => set({ sport: e.target.value })} />
            <datalist id="sports-list">
              {sports.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label={t("Date")}>
            <input type="date" className={inputCls} value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("Duration (min)")}>
            <input type="number" className={inputCls} value={draft.durationMin} onChange={(e) => set({ durationMin: Number(e.target.value) })} />
          </Field>
          <Field label={t("Distance (km)")}>
            <input type="number" className={inputCls} value={draft.distanceKm ?? ""} onChange={(e) => set({ distanceKm: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
          <Field label={t("Avg pulse")}>
            <input type="number" className={inputCls} value={draft.avgPulse ?? ""} onChange={(e) => set({ avgPulse: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([
            ["intensity", t("Intensity")],
            ["performance", t("Performance")],
            ["fun", t("Fun")],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm font-semibold text-[var(--accent)]">{draft[k] as number}</span>
              </div>
              <ScaleInput value={draft[k] as number} onChange={(v) => set({ [k]: v } as Partial<Workout>)} />
            </div>
          ))}
        </div>

        {/* Exercises */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">{t("Exercises")}</span>
            <Button variant="soft" size="sm" onClick={addExercise}>
              <Plus size={14} /> {t("Add exercise")}
            </Button>
          </div>
          <div className="space-y-2">
            {draft.exercises.map((ex) => (
              <div key={ex.id} className="rounded-xl border border-[var(--border)] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    className={inputCls}
                    placeholder={t("Exercise name")}
                    value={ex.name}
                    onChange={(e) => updateExercise(ex.id, { name: e.target.value })}
                  />
                  <button onClick={() => set({ exercises: draft.exercises.filter((x) => x.id !== ex.id) })} className="text-[var(--text-faint)] hover:text-[var(--bad)]">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {ex.sets.map((st, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 text-xs text-[var(--text-faint)]">{i + 1}</span>
                      <input
                        type="number"
                        className={inputCls + " !py-1.5"}
                        placeholder={t("Reps")}
                        value={st.reps ?? ""}
                        onChange={(e) => {
                          const sets = ex.sets.map((s, j) => (j === i ? { ...s, reps: Number(e.target.value) } : s));
                          updateExercise(ex.id, { sets });
                        }}
                      />
                      <input
                        type="number"
                        className={inputCls + " !py-1.5"}
                        placeholder={t("Weight (kg)")}
                        value={st.weight ?? ""}
                        onChange={(e) => {
                          const sets = ex.sets.map((s, j) => (j === i ? { ...s, weight: Number(e.target.value) } : s));
                          updateExercise(ex.id, { sets });
                        }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => updateExercise(ex.id, { sets: [...ex.sets, { reps: 10, weight: ex.sets[ex.sets.length - 1]?.weight ?? 0 }] })}
                    className="text-xs text-[var(--accent)]"
                  >
                    + {t("Add set")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Field label={t("Notes")}>
          <textarea className={inputCls} rows={2} value={draft.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button
            onClick={() => {
              saveWorkout(draft);
              onClose();
            }}
          >
            <Save size={16} /> {t("Save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
