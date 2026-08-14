"use client";

import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Play, Plus, Save, Square, Trash2, TrendingUp, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Exercise, Workout, WorkoutPlan, PlanExercise } from "@/lib/types";
import { DEFAULT_SPORTS, uid } from "@/lib/defaults";
import { sportKind, paceLabel, speedKmh } from "@/lib/sports";
import { MUSCLE_LABEL, Muscle, muscleFor, PLAN_TEMPLATES } from "@/lib/exercises";
import { ExerciseSelect } from "@/components/ExercisePicker";
import { exerciseHistory, loggedExerciseNames, muscleVolume, personalRecords } from "@/lib/trainingStats";
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
  Chip,
  ScaleInput,
} from "@/components/ui";
import { Bars, TrendLine } from "@/components/charts";

type Tab = "workouts" | "plans" | "progress";

export default function TrainingPage() {
  const { data, removeWorkout } = useStore();
  const t = useT();
  const [tab, setTab] = useState<Tab>("workouts");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Workout | undefined>();
  const [fromPlan, setFromPlan] = useState<WorkoutPlan | undefined>();

  const workouts = useMemo(
    () => [...data.workouts].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.workouts],
  );

  function newWorkout(plan?: WorkoutPlan) {
    setEditing(undefined);
    setFromPlan(plan);
    setModal(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Training")}
        subtitle={t("Plan workouts, log sets and track strength progress.")}
        action={
          <Button onClick={() => newWorkout()}>
            <Plus size={16} /> {t("Log workout")}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Chip active={tab === "workouts"} onClick={() => setTab("workouts")}>{t("Workouts")}</Chip>
        <Chip active={tab === "plans"} onClick={() => setTab("plans")}>{t("Plans")}</Chip>
        <Chip active={tab === "progress"} onClick={() => setTab("progress")}>{t("Progress")}</Chip>
      </div>

      {tab === "workouts" && (
        <WorkoutsTab
          workouts={workouts}
          onEdit={(w) => {
            setEditing(w);
            setFromPlan(undefined);
            setModal(true);
          }}
          onDelete={removeWorkout}
          onNew={() => newWorkout()}
        />
      )}
      {tab === "plans" && <PlansTab onStart={(p) => newWorkout(p)} />}
      {tab === "progress" && <ProgressTab workouts={data.workouts} />}

      <WorkoutModal open={modal} onClose={() => setModal(false)} editing={editing} fromPlan={fromPlan} />
    </div>
  );
}

/* ---------------- Workouts tab ---------------- */

function WorkoutsTab({
  workouts,
  onEdit,
  onDelete,
  onNew,
}: {
  workouts: Workout[];
  onEdit: (w: Workout) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const { data } = useStore();
  const t = useT();
  const week = isoRange(todayISO(), 7);
  const thisWeek = workouts.filter((w) => week.includes(w.date));
  const totalMin = workouts.reduce((s, w) => s + w.durationMin, 0);
  const perf = workouts.filter((w) => w.performance);
  const avgPerf = perf.length ? (perf.reduce((s, w) => s + (w.performance ?? 0), 0) / perf.length).toFixed(1) : "—";

  const volume = useMemo(() => {
    const weeks: { label: string; value: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const start = isoRange(todayISO(), (w + 1) * 7).slice(0, 7);
      const range = new Set(start);
      const mins = data.workouts.filter((x) => range.has(x.date)).reduce((s, x) => s + x.durationMin, 0);
      weeks.push({ label: fmtShort(start[0]), value: Math.round(mins / 60) });
    }
    return weeks;
  }, [data.workouts]);

  return (
    <>
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
              <Button variant="soft" size="sm" onClick={onNew}>
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
                      {paceLabel(w.distanceKm, w.durationMin) ? ` · ${paceLabel(w.distanceKm, w.durationMin)}` : ""}
                      {w.rounds ? ` · ${w.rounds} ${t("rounds")}` : ""}
                      {w.avgPulse ? ` · ${w.avgPulse} bpm` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(w)} className="rounded-lg px-2 py-1 text-xs text-[var(--text-faint)] hover:bg-[var(--surface-2)]">
                      {t("Edit")}
                    </button>
                    <button onClick={() => onDelete(w.id)} className="rounded-lg p-1.5 text-[var(--text-faint)] hover:text-[var(--bad)]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {w.exercises.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {w.exercises.map((ex) => {
                      const best = ex.sets.reduce((m, s) => Math.max(m, s.weight ?? 0), 0);
                      return (
                        <span key={ex.id} className="rounded-lg bg-[var(--surface-2)] px-2 py-1 text-xs">
                          {ex.name} · {ex.sets.length}×{best ? ` ${best}kg` : ""}
                        </span>
                      );
                    })}
                  </div>
                )}
                {w.notes && <p className="mt-2 text-xs text-[var(--text-muted)]">{w.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

/* ---------------- Plans tab ---------------- */

function PlansTab({ onStart }: { onStart: (p: WorkoutPlan) => void }) {
  const { data, savePlan, removePlan } = useStore();
  const t = useT();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<WorkoutPlan | undefined>();

  const existingNames = new Set(data.workoutPlans.map((p) => p.name.toLowerCase()));

  return (
    <>
      <Card>
        <SectionTitle
          right={
            <Button variant="soft" size="sm" onClick={() => { setEditing(undefined); setModal(true); }}>
              <Plus size={15} /> {t("New plan")}
            </Button>
          }
        >
          {t("Your plans")}
        </SectionTitle>
        {data.workoutPlans.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">{t("Create a plan (e.g. Push / Pull / Legs) so you can start a workout in one tap.")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.workoutPlans.map((p) => (
              <div key={p.id} className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex items-start justify-between">
                  <div className="font-medium">{p.name}</div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(p); setModal(true); }} className="rounded-lg px-2 py-1 text-xs text-[var(--text-faint)] hover:bg-[var(--surface-2)]">{t("Edit")}</button>
                    <button onClick={() => removePlan(p.id)} className="rounded-lg p-1.5 text-[var(--text-faint)] hover:text-[var(--bad)]"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  {p.exercises.map((e) => e.name).join(" · ") || t("No exercises yet")}
                </div>
                <Button size="sm" className="mt-3" onClick={() => onStart(p)}>{t("Start workout")}</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>{t("Templates")}</SectionTitle>
        <p className="mb-3 text-sm text-[var(--text-muted)]">{t("Add a ready-made split, then customise it.")}</p>
        <div className="flex flex-wrap gap-2">
          {PLAN_TEMPLATES.map((tpl) => (
            <button
              key={tpl.name}
              disabled={existingNames.has(tpl.name.toLowerCase())}
              onClick={() => savePlan({ id: "", name: tpl.name, exercises: tpl.exercises, createdAt: "" })}
              className="rounded-full bg-[var(--surface-2)] px-3.5 py-1.5 text-sm font-medium text-[var(--text-muted)] enabled:hover:bg-[var(--surface-3)] disabled:opacity-40"
            >
              + {tpl.name}
            </button>
          ))}
        </div>
      </Card>

      <PlanModal open={modal} onClose={() => setModal(false)} editing={editing} />
    </>
  );
}

/* ---------------- Progress tab ---------------- */

function ProgressTab({ workouts }: { workouts: Workout[] }) {
  const t = useT();
  const names = useMemo(() => loggedExerciseNames(workouts), [workouts]);
  const [exercise, setExercise] = useState<string>("");
  const selected = exercise || names[0] || "";
  const history = useMemo(() => (selected ? exerciseHistory(workouts, selected) : []), [workouts, selected]);
  const muscles = useMemo(() => muscleVolume(workouts, 30), [workouts]);
  const records = useMemo(() => personalRecords(workouts), [workouts]);

  const chart = history.map((p) => ({ date: p.date, value: p.best1RM || p.bestWeight }));
  const first = history[0]?.best1RM || history[0]?.bestWeight || 0;
  const last = history.length ? history[history.length - 1].best1RM || history[history.length - 1].bestWeight : 0;
  const delta = last - first;

  const maxVol = muscles.reduce((m, x) => Math.max(m, x.volume), 0) || 1;

  if (workouts.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp size={26} />}
        title={t("No progress data yet")}
        hint={t("Log a few workouts with weights and reps to see your strength trend per exercise and muscle group.")}
      />
    );
  }

  return (
    <>
      <CardioProgressCard workouts={workouts} />

      <Card>
        <SectionTitle
          right={
            names.length > 0 ? (
              <select className={`${inputCls} w-auto`} value={selected} onChange={(e) => setExercise(e.target.value)}>
                {names.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            ) : undefined
          }
        >
          {t("Exercise progress")}
        </SectionTitle>
        {chart.length >= 2 ? (
          <>
            <div className="mb-2 flex items-baseline gap-2 text-sm">
              <span className="text-[var(--text-muted)]">{t("Estimated 1RM")}:</span>
              <span className="num text-lg font-bold">{last} kg</span>
              {delta !== 0 && (
                <span className={delta > 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}>
                  {delta > 0 ? "+" : ""}{delta} kg
                </span>
              )}
            </div>
            <TrendLine data={chart} color="var(--accent)" unit="kg" name={t("Estimated 1RM")} />
          </>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">{t("Log this exercise on at least two days to see a trend.")}</p>
        )}
      </Card>

      {records.length > 0 && (
        <Card>
          <SectionTitle right={<Trophy size={16} className="text-[var(--text-faint)]" />}>{t("Personal records")}</SectionTitle>
          <p className="mb-3 text-xs text-[var(--text-muted)]">{t("Best estimated one-rep max per exercise.")}</p>
          <div className="space-y-1.5">
            {records.slice(0, 8).map((r) => (
              <div key={r.name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-2)]">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
                {r.isNew && <Badge tone="good">{t("New PR")}</Badge>}
                <span className="text-xs text-[var(--text-faint)]">{r.weight}kg × {r.reps}</span>
                <span className="num w-16 text-right text-sm font-bold">{r.best1RM} kg</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle>{t("Volume by muscle group")} · {t("last 30 days")}</SectionTitle>
        {muscles.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("No sets logged in the last 30 days.")}</p>
        ) : (
          <div className="space-y-2.5">
            {muscles.map((m) => (
              <div key={m.muscle}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{muscleLabel(m.muscle, t)}</span>
                  <span className="text-[var(--text-faint)]">{m.sets} {t("sets")} · {m.volume.toLocaleString()} kg</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--ring-track)]">
                  <div className="grad h-full rounded-full" style={{ width: `${Math.round((m.volume / maxVol) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function CardioProgressCard({ workouts }: { workouts: Workout[] }) {
  const t = useT();
  const sports = useMemo(() => {
    const s = new Set<string>();
    for (const w of workouts) if (sportKind(w.sport) === "distance" && w.distanceKm) s.add(w.sport);
    return [...s];
  }, [workouts]);
  const [sport, setSport] = useState<string>("");
  const active = sport && sports.includes(sport) ? sport : sports[0] ?? "";

  const sessions = useMemo(
    () =>
      workouts
        .filter((w) => w.sport === active && w.distanceKm && w.durationMin)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [workouts, active],
  );

  if (sports.length === 0) return null;

  const distSeries = sessions.map((w) => ({ date: w.date, value: w.distanceKm as number }));
  const paceSeries = sessions.map((w) => ({ date: w.date, value: Math.round((w.durationMin / (w.distanceKm as number)) * 100) / 100 }));
  const bestDist = sessions.reduce((m, w) => Math.max(m, w.distanceKm as number), 0);
  const bestPace = sessions.reduce((m, w) => Math.min(m, w.durationMin / (w.distanceKm as number)), Infinity);
  const totalKm = Math.round(sessions.reduce((s, w) => s + (w.distanceKm as number), 0) * 10) / 10;

  const fmtPace = (p: number) => {
    if (!isFinite(p)) return "—";
    const m = Math.floor(p);
    const s = Math.round((p - m) * 60);
    return `${m}:${String(s).padStart(2, "0")} /km`;
  };

  return (
    <Card>
      <SectionTitle
        right={
          sports.length > 1 ? (
            <select className={`${inputCls} w-auto`} value={active} onChange={(e) => setSport(e.target.value)}>
              {sports.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <Badge tone="accent">{active}</Badge>
          )
        }
      >
        {t("Cardio progress")}
      </SectionTitle>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <MiniStat label={t("Best distance")} value={`${bestDist} km`} />
        <MiniStat label={t("Best pace")} value={fmtPace(bestPace)} />
        <MiniStat label={t("Total")} value={`${totalKm} km`} />
      </div>
      {distSeries.length >= 2 ? (
        <>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{t("Distance (km)")}</div>
          <TrendLine data={distSeries} color="var(--accent)" unit=" km" name={t("Distance (km)")} height={180} />
          <div className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{t("Pace")} ({t("min/km")})</div>
          <TrendLine data={paceSeries} color="var(--info)" name={t("Pace")} height={140} />
          <p className="mt-2 text-[11px] text-[var(--text-faint)]">{t("Lower pace is faster.")}</p>
        </>
      ) : (
        <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("Log at least two sessions of this sport to see a trend.")}</p>
      )}
    </Card>
  );
}

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function muscleLabel(m: string, t: (k: string) => string): string {
  return m in MUSCLE_LABEL ? t(MUSCLE_LABEL[m as Muscle]) : t("Other");
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="!p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}

/* ---------------- Plan editor ---------------- */

function PlanModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: WorkoutPlan }) {
  const { savePlan } = useStore();
  const t = useT();
  const blank: WorkoutPlan = { id: "", name: "", exercises: [], createdAt: "" };
  const [draft, setDraft] = useState<WorkoutPlan>(editing ?? blank);
  const key = editing?.id ?? "new";
  const [lk, setLk] = useState(key);
  if (open && key !== lk) {
    setLk(key);
    setDraft(editing ?? blank);
  }
  const set = (patch: Partial<WorkoutPlan>) => setDraft((d) => ({ ...d, ...patch }));

  function addExercise() {
    set({ exercises: [...draft.exercises, { name: "", sets: 3, targetReps: 10 }] });
  }
  function updateEx(i: number, patch: Partial<PlanExercise>) {
    set({ exercises: draft.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t("Edit plan") : t("New plan")} wide>
      <div className="space-y-4">
        <Field label={t("Plan name")}>
          <input className={inputCls} placeholder="Push" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">{t("Exercises")}</span>
            <Button variant="soft" size="sm" onClick={addExercise}><Plus size={14} /> {t("Add exercise")}</Button>
          </div>
          <div className="space-y-2">
            {draft.exercises.map((ex, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] p-2.5">
                <div className="min-w-[140px] flex-1">
                  <ExerciseSelect
                    value={ex.name}
                    placeholder={t("Exercise name")}
                    onChange={(name, muscle) => updateEx(i, { name, muscle })}
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--text-faint)]">
                  <input type="number" className={`${inputCls} !py-1.5 w-14`} placeholder={t("Sets")} value={ex.sets ?? ""} onChange={(e) => updateEx(i, { sets: e.target.value ? Number(e.target.value) : undefined })} />
                  ×
                  <input type="number" className={`${inputCls} !py-1.5 w-14`} placeholder={t("Reps")} value={ex.targetReps ?? ""} onChange={(e) => updateEx(i, { targetReps: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <button onClick={() => set({ exercises: draft.exercises.filter((_, j) => j !== i) })} className="text-[var(--text-faint)] hover:text-[var(--bad)]">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={() => { if (draft.name.trim()) { savePlan(draft); onClose(); } }} disabled={!draft.name.trim()}>
            <Save size={16} /> {t("Save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Workout editor ---------------- */

function planToExercises(plan: WorkoutPlan): Exercise[] {
  return plan.exercises.map((pe) => ({
    id: uid("ex"),
    name: pe.name,
    muscle: pe.muscle ?? muscleFor(pe.name),
    sets: Array.from({ length: Math.max(1, pe.sets ?? 3) }, () => ({
      targetReps: pe.targetReps,
      targetWeight: pe.targetWeight,
      reps: undefined,
      weight: undefined,
    })),
  }));
}

function WorkoutModal({
  open,
  onClose,
  editing,
  fromPlan,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Workout;
  fromPlan?: WorkoutPlan;
}) {
  const { data, saveWorkout } = useStore();
  const t = useT();
  const sports = useMemo(() => {
    const custom = data.habits.filter((h) => h.area === "sport").map((h) => h.name);
    return Array.from(new Set([...DEFAULT_SPORTS, ...custom]));
  }, [data.habits]);

  const makeBlank = (): Workout => ({
    id: "",
    date: todayISO(),
    sport: fromPlan ? fromPlan.name : sports[0] ?? "Strength Training",
    durationMin: 60,
    intensity: 7,
    performance: 7,
    fun: 7,
    energyBefore: 6,
    energyAfter: 6,
    exercises: fromPlan ? planToExercises(fromPlan) : [],
  });
  const [draft, setDraft] = useState<Workout>(editing ?? makeBlank());
  const key = editing?.id ?? `new-${fromPlan?.id ?? ""}`;
  const [lk, setLk] = useState<string | null>(null);
  // Live session timer → fills duration on stop.
  const [timerOn, setTimerOn] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  if (open && key !== lk) {
    setLk(key);
    setDraft(editing ?? makeBlank());
  }
  if (!open && lk !== null) {
    setLk(null);
    if (timerOn) setTimerOn(false);
    if (elapsedSec) setElapsedSec(0);
  }

  const set = (patch: Partial<Workout>) => setDraft((d) => ({ ...d, ...patch }));
  const kind = sportKind(draft.sport);

  useEffect(() => {
    if (!timerOn) return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerOn]);
  function toggleTimer() {
    if (timerOn) {
      setTimerOn(false);
      set({ durationMin: Math.max(1, Math.round(elapsedSec / 60)) });
    } else {
      setElapsedSec(0);
      setTimerOn(true);
    }
  }

  function addExercise() {
    set({ exercises: [...draft.exercises, { id: uid("ex"), name: "", sets: [{ reps: 10, weight: 0 }] }] });
  }
  function updateExercise(id: string, patch: Partial<Exercise>) {
    set({ exercises: draft.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  }

  const pace = paceLabel(draft.distanceKm, draft.durationMin);
  const speed = speedKmh(draft.distanceKm, draft.durationMin);

  return (
    <Modal open={open} onClose={onClose} title={editing ? t("Edit workout") : t("New workout")} wide>
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
            <input type="date" max={todayISO()} className={inputCls} value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
        </div>

        {/* Duration + live timer */}
        <div className="flex items-end gap-3">
          <Field label={t("Duration (min)")} className="flex-1">
            <input type="number" className={inputCls} value={draft.durationMin} onChange={(e) => set({ durationMin: Number(e.target.value) })} />
          </Field>
          <button
            onClick={toggleTimer}
            className={`flex h-[42px] items-center gap-2 rounded-xl px-4 text-sm font-medium ${
              timerOn ? "bg-[var(--bad)] text-white" : "bg-[var(--accent)] text-white"
            }`}
          >
            {timerOn ? <><Square size={15} /> {fmtClock(elapsedSec)}</> : <><Play size={15} /> {t("Start timer")}</>}
          </button>
        </div>

        {/* Sport-specific metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {kind === "distance" && (
            <>
              <Field label={t("Distance (km)")}>
                <input type="number" inputMode="decimal" step="0.1" className={inputCls} value={draft.distanceKm ?? ""} onChange={(e) => set({ distanceKm: e.target.value ? Number(e.target.value) : undefined })} />
              </Field>
              <div>
                <div className="mb-1 block text-sm font-medium text-[var(--text-muted)]">{t("Pace")}</div>
                <div className="flex h-[42px] items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm tabular-nums">
                  {pace ? `${pace}${speed ? ` · ${speed} km/h` : ""}` : "—"}
                </div>
              </div>
            </>
          )}
          {kind === "rounds" && (
            <Field label={t("Rounds")}>
              <input type="number" inputMode="numeric" className={inputCls} value={draft.rounds ?? ""} onChange={(e) => set({ rounds: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
          )}
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

        {/* Exercises — strength only */}
        {kind === "strength" && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t("Exercises")}</span>
              <Button variant="soft" size="sm" onClick={addExercise}>
                <Plus size={14} /> {t("Add exercise")}
              </Button>
            </div>
            <div className="space-y-2">
              {draft.exercises.map((ex) => (
                <ExerciseEditor key={ex.id} ex={ex} onChange={(p) => updateExercise(ex.id, p)} onRemove={() => set({ exercises: draft.exercises.filter((x) => x.id !== ex.id) })} />
              ))}
            </div>
          </div>
        )}

        <Field label={t("Notes")}>
          <textarea className={inputCls} rows={2} value={draft.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={() => { saveWorkout(draft); onClose(); }}>
            <Save size={16} /> {t("Save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ExerciseEditor({ ex, onChange, onRemove }: { ex: Exercise; onChange: (p: Partial<Exercise>) => void; onRemove: () => void }) {
  const t = useT();
  const muscle = ex.muscle;
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex-1">
          <ExerciseSelect
            value={ex.name}
            placeholder={t("Exercise name")}
            onChange={(name, m) => onChange({ name, muscle: m })}
          />
        </div>
        {muscle && <Badge>{t(MUSCLE_LABEL[muscle as Muscle] ?? "Other")}</Badge>}
        <button onClick={onRemove} className="shrink-0 text-[var(--text-faint)] hover:text-[var(--bad)]">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-[1.2rem_1fr_1fr] items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
        <span />
        <span className="text-center">{t("Target")} ({t("reps")}×kg)</span>
        <span className="text-center">{t("Actual")} ({t("reps")}×kg)</span>
      </div>
      <div className="space-y-1.5">
        {ex.sets.map((st, i) => (
          <div key={i} className="grid grid-cols-[1.2rem_1fr_1fr] items-center gap-2">
            <span className="text-xs text-[var(--text-faint)]">{i + 1}</span>
            <div className="flex items-center gap-1">
              <input type="number" className={`${inputCls} !py-1.5`} placeholder="—" value={st.targetReps ?? ""} onChange={(e) => setSet(ex, onChange, i, { targetReps: numOrU(e.target.value) })} />
              <span className="text-[var(--text-faint)]">×</span>
              <input type="number" className={`${inputCls} !py-1.5`} placeholder="—" value={st.targetWeight ?? ""} onChange={(e) => setSet(ex, onChange, i, { targetWeight: numOrU(e.target.value) })} />
            </div>
            <div className="flex items-center gap-1">
              <input type="number" inputMode="numeric" className={`${inputCls} !py-1.5`} placeholder={String(st.targetReps ?? "")} value={st.reps ?? ""} onChange={(e) => setSet(ex, onChange, i, { reps: numOrU(e.target.value) })} />
              <span className="text-[var(--text-faint)]">×</span>
              <input type="number" inputMode="decimal" className={`${inputCls} !py-1.5`} placeholder={String(st.targetWeight ?? "")} value={st.weight ?? ""} onChange={(e) => setSet(ex, onChange, i, { weight: numOrU(e.target.value) })} />
            </div>
          </div>
        ))}
        <div className="flex gap-3 pt-0.5">
          <button
            onClick={() => {
              const last = ex.sets[ex.sets.length - 1];
              onChange({ sets: [...ex.sets, { targetReps: last?.targetReps, targetWeight: last?.targetWeight, weight: last?.weight }] });
            }}
            className="text-xs text-[var(--accent)]"
          >
            + {t("Add set")}
          </button>
          {ex.sets.length > 1 && (
            <button onClick={() => onChange({ sets: ex.sets.slice(0, -1) })} className="text-xs text-[var(--text-faint)]">
              − {t("Remove set")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function numOrU(v: string): number | undefined {
  return v === "" ? undefined : Number(v);
}
function setSet(ex: Exercise, onChange: (p: Partial<Exercise>) => void, i: number, patch: Partial<Exercise["sets"][number]>) {
  onChange({ sets: ex.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
}
