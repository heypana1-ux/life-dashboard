"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { AppData, Experiment, ExperimentCondition, ExperimentMetric } from "@/lib/types";
import { evaluateExperiment } from "@/lib/experiments";
import { addDays, fmtDuration, todayISO, fmtShort } from "@/lib/date";
import { Card, PageHeader, SectionTitle, Button, Modal, Field, inputCls, EmptyState, Badge } from "@/components/ui";

const METRICS: ExperimentMetric[] = ["lifeScore", "productivity", "mood", "energy", "sleep"];
const CONDITIONS: ExperimentCondition[] = ["manual", "bedtimeBefore", "sleepAtLeast", "trained", "habitDone"];

const METRIC_LABEL: Record<ExperimentMetric, string> = {
  lifeScore: "Life Score",
  productivity: "Productivity",
  mood: "Mood",
  energy: "Energy",
  sleep: "Sleep",
};
const CONDITION_LABEL: Record<ExperimentCondition, string> = {
  manual: "My own condition",
  bedtimeBefore: "Bedtime before…",
  sleepAtLeast: "Sleep at least…",
  trained: "On days I train",
  habitDone: "A specific habit is done",
};

export default function ExperimentsPage() {
  const { data, saveExperiment, removeExperiment } = useStore();
  const t = useT();
  const [modal, setModal] = useState(false);

  const experiments = useMemo(
    () => [...data.experiments].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [data.experiments],
  );
  const suggestions = useMemo(() => suggestExperiments(data), [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("30-day window")}
        title={t("Experiments")}
        subtitle={t("Test a hypothesis against your own data — correlation, not proof.")}
        action={
          <Button onClick={() => setModal(true)}>
            <Plus size={16} /> {t("New experiment")}
          </Button>
        }
      />

      {suggestions.length > 0 && (
        <Card>
          <SectionTitle>{t("Suggested for you")}</SectionTitle>
          <p className="mb-3 text-xs text-[var(--text-muted)]">{t("Based on what you already track — start one with a tap.")}</p>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.title} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t(s.title)}</div>
                  {s.hypothesis && <div className="truncate text-xs text-[var(--text-muted)]">{t(s.hypothesis)}</div>}
                </div>
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => saveExperiment({ ...s, title: t(s.title), hypothesis: s.hypothesis ? t(s.hypothesis) : "" })}
                >
                  <Plus size={14} /> {t("Start")}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {experiments.length === 0 ? (
        <EmptyState
          icon={<FlaskConical size={26} />}
          title={t("No experiments yet")}
          hint={t('e.g. "When I go to bed before midnight, am I more productive the next day?"')}
          action={
            <Button variant="soft" size="sm" onClick={() => setModal(true)}>
              <Plus size={16} /> {t("New experiment")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {experiments.map((e) => (
            <ExperimentCard key={e.id} exp={e} onDelete={() => removeExperiment(e.id)} />
          ))}
        </div>
      )}

      <ExperimentModal open={modal} onClose={() => setModal(false)} onSave={(e) => { saveExperiment(e); setModal(false); }} />
    </div>
  );
}

function ExperimentCard({ exp, onDelete }: { exp: Experiment; onDelete: () => void }) {
  const { data } = useStore();
  const t = useT();
  const res = useMemo(() => evaluateExperiment(data, exp), [data, exp]);

  const metricName = t(METRIC_LABEL[exp.metric]);
  const condName = conditionText(exp, t);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{exp.title}</div>
          {exp.hypothesis && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{exp.hypothesis}</p>}
        </div>
        <button onClick={onDelete} className="shrink-0 text-[var(--text-faint)] hover:text-[var(--bad)]">
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone="accent">{metricName}</Badge>
        <Badge>{condName}</Badge>
        <Badge>{t("last {n} days", { n: exp.days })}</Badge>
      </div>

      <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-3">
        {!res.enough ? (
          <p className="text-sm text-[var(--text-muted)]">
            {t("Not enough data yet ({met} vs {not} days). Keep logging.", { met: res.nMet, not: res.nNot })}
          </p>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <span
                className="num text-[34px] font-bold leading-none tracking-[-0.03em]"
                style={{ color: res.diffPct >= 0 ? "var(--good)" : "var(--bad)" }}
              >
                {res.diffPct >= 0 ? "+" : "−"}{Math.abs(res.diffPct)}%
              </span>
              <span className="mb-0.5 text-[13px] text-[var(--text-muted)]">
                {res.diffPct >= 0 ? t("higher") : t("lower")}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              {t("On days with the condition, {metric} was on average {pct} {dir}.", {
                metric: metricName,
                pct: `${Math.abs(res.diffPct)}%`,
                dir: res.diffPct >= 0 ? t("higher") : t("lower"),
              })}
            </p>
            <div className="mt-2 flex gap-4 text-xs text-[var(--text-faint)]">
              <span>
                {t("With")}: {fmtMetric(exp.metric, res.metMean)} ({res.nMet})
              </span>
              <span>
                {t("Without")}: {fmtMetric(exp.metric, res.notMean)} ({res.nNot})
              </span>
            </div>
          </>
        )}
      </div>

      {exp.condition === "manual" && <ManualMarker exp={exp} />}

      <p className="mt-2 text-[11px] text-[var(--text-faint)]">
        {t("Observation from your own data — a correlation, not causation.")}
      </p>
    </Card>
  );
}

function fmtMetric(m: ExperimentMetric, v: number): string {
  if (m === "sleep") return fmtDuration(Math.round(v));
  return String(v);
}

/** For a manual/custom condition: mark the days it was true (backfill the last 3 weeks). */
function ManualMarker({ exp }: { exp: Experiment }) {
  const { saveExperiment } = useStore();
  const t = useT();
  const today = todayISO();
  const marked = new Set(exp.manualDates ?? []);
  const days = Array.from({ length: 21 }, (_, i) => addDays(today, -i)).reverse();

  function toggle(date: string) {
    const next = new Set(marked);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    saveExperiment({ ...exp, manualDates: [...next].sort() });
  }

  const label = exp.conditionLabel?.trim() || t("condition");
  return (
    <div className="mt-3 rounded-xl border border-[var(--border)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          {t("Days “{label}” was true", { label })}
        </span>
        <button
          onClick={() => toggle(today)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            marked.has(today) ? "grad text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
          }`}
        >
          {marked.has(today) ? t("Today ✓") : t("Mark today")}
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {days.map((d) => {
          const on = marked.has(d);
          return (
            <button
              key={d}
              onClick={() => toggle(d)}
              title={fmtShort(d)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold transition ${
                on ? "grad text-white" : "bg-[var(--surface-2)] text-[var(--text-faint)] hover:bg-[var(--surface-3)]"
              }`}
            >
              {Number(d.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A readable fallback title when the user leaves the title blank. */
function autoTitle(exp: Experiment, t: (k: string, v?: Record<string, string | number>) => string): string {
  return `${t(METRIC_LABEL[exp.metric])} · ${conditionText(exp, t)}`;
}

function conditionText(exp: Experiment, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (exp.condition === "bedtimeBefore") {
    const mins = exp.threshold ?? 24 * 60;
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return t("Bedtime before {time}", { time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` });
  }
  if (exp.condition === "sleepAtLeast") return t("Sleep ≥ {dur}", { dur: fmtDuration(exp.threshold ?? 450) });
  if (exp.condition === "trained") return t("On days I train");
  if (exp.condition === "manual") return exp.conditionLabel?.trim() || t("My own condition");
  return t("A specific habit is done");
}

/** Data-driven experiment suggestions based on what the user already tracks. */
function suggestExperiments(data: AppData): Experiment[] {
  const out: Experiment[] = [];
  const has = (pred: (e: Experiment) => boolean) => data.experiments.some(pred);
  const base = { id: "", createdAt: "", days: 30 };

  if (data.sleep.length >= 6 && data.reviews.length >= 6) {
    if (!has((e) => e.condition === "bedtimeBefore"))
      out.push({ ...base, title: "Before midnight = more productive?", hypothesis: "Going to bed before 00:00 makes me more productive.", metric: "productivity", condition: "bedtimeBefore", threshold: 24 * 60 });
    if (!has((e) => e.condition === "sleepAtLeast"))
      out.push({ ...base, title: "More sleep = better mood?", hypothesis: "≥7:30 of sleep lifts my mood.", metric: "mood", condition: "sleepAtLeast", threshold: 7 * 60 + 30 });
  }

  const hasSport = data.workouts.length >= 4 || data.habits.some((h) => h.area === "sport" && h.kind === "build");
  if (hasSport && !has((e) => e.condition === "trained"))
    out.push({ ...base, title: "Training lifts my day", hypothesis: "My Life Score is higher on days I train.", metric: "lifeScore", condition: "trained" });

  // Top-used build habit → does it move the score?
  const doneCounts = new Map<string, number>();
  for (const l of data.habitLogs) if (l.done) doneCounts.set(l.habitId, (doneCounts.get(l.habitId) ?? 0) + 1);
  let topHabit: { id: string; name: string } | null = null;
  let topN = 5;
  for (const h of data.habits.filter((x) => x.kind === "build" && !x.archived)) {
    const n = doneCounts.get(h.id) ?? 0;
    if (n > topN) {
      topN = n;
      topHabit = { id: h.id, name: h.name };
    }
  }
  if (topHabit && !has((e) => e.condition === "habitDone" && e.habitId === topHabit!.id))
    out.push({ ...base, title: topHabit.name, hypothesis: "", metric: "lifeScore", condition: "habitDone", habitId: topHabit.id });

  if (data.settings.areas.some((a) => a.key === "health" && a.enabled) && data.health.some((h) => h.wellbeing != null) && !has((e) => e.condition === "trained" && e.metric === "sleep"))
    out.push({ ...base, title: "Training ↔ my sleep", hypothesis: "I sleep better on days I train.", metric: "sleep", condition: "trained" });

  return out.slice(0, 3);
}

const TEMPLATES: { title: string; hypothesis: string; metric: ExperimentMetric; condition: ExperimentCondition; threshold?: number }[] = [
  { title: "Before midnight = more productive?", hypothesis: "Going to bed before 00:00 makes me more productive.", metric: "productivity", condition: "bedtimeBefore", threshold: 24 * 60 },
  { title: "More sleep = better mood?", hypothesis: "≥7:30 of sleep lifts my mood.", metric: "mood", condition: "sleepAtLeast", threshold: 7 * 60 + 30 },
  { title: "Training lifts my day", hypothesis: "My Life Score is higher on days I train.", metric: "lifeScore", condition: "trained" },
];

function ExperimentModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (e: Experiment) => void }) {
  const { data } = useStore();
  const t = useT();

  const blank: Experiment = {
    id: "",
    title: "",
    hypothesis: "",
    metric: "productivity",
    condition: "manual",
    conditionLabel: "",
    threshold: 24 * 60,
    days: 30,
    createdAt: "",
  };
  const [draft, setDraft] = useState<Experiment>(blank);
  const [lk, setLk] = useState(false);
  if (open && !lk) {
    setLk(true);
    setDraft(blank);
  }
  if (!open && lk) setLk(false);

  const set = (patch: Partial<Experiment>) => setDraft((d) => ({ ...d, ...patch }));
  const sportHabits = data.habits.filter((h) => h.area === "sport" || h.kind === "build");

  return (
    <Modal open={open} onClose={onClose} title={t("New experiment")} wide>
      <div className="space-y-4">
        <Field label={t("Title")} hint={t("Optional — a name is generated if you leave this empty.")}>
          <input
            className={inputCls}
            value={draft.title}
            placeholder={t("e.g. Sleep vs. productivity")}
            onChange={(e) => set({ title: e.target.value })}
          />
        </Field>
        <Field label={t("Hypothesis")}>
          <textarea className={inputCls} rows={2} value={draft.hypothesis ?? ""} onChange={(e) => set({ hypothesis: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Outcome metric")}>
            <select className={inputCls} value={draft.metric} onChange={(e) => set({ metric: e.target.value as ExperimentMetric })}>
              {METRICS.map((m) => (
                <option key={m} value={m}>{t(METRIC_LABEL[m])}</option>
              ))}
            </select>
          </Field>
          <Field label={t("Condition")}>
            <select className={inputCls} value={draft.condition} onChange={(e) => set({ condition: e.target.value as ExperimentCondition })}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{t(CONDITION_LABEL[c])}</option>
              ))}
            </select>
          </Field>
        </div>

        {draft.condition === "manual" && (
          <Field
            label={t("Name your condition")}
            hint={t("You mark the days it was true — then compare your metric on those days vs. the rest.")}
          >
            <input
              className={inputCls}
              value={draft.conditionLabel ?? ""}
              placeholder={t("e.g. Nose healed · Meditated · No coffee")}
              onChange={(e) => set({ conditionLabel: e.target.value })}
            />
          </Field>
        )}
        {draft.condition === "bedtimeBefore" && (
          <Field label={t("Bedtime before")}>
            <input
              type="time"
              className={inputCls}
              value={minutesToTime(draft.threshold ?? 24 * 60)}
              onChange={(e) => set({ threshold: bedtimeToMinutes(e.target.value) })}
            />
          </Field>
        )}
        {draft.condition === "sleepAtLeast" && (
          <Field label={`${t("Sleep at least")}: ${fmtDuration(draft.threshold ?? 450)}`}>
            <input
              type="range"
              min={300}
              max={600}
              step={15}
              value={draft.threshold ?? 450}
              onChange={(e) => set({ threshold: Number(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
          </Field>
        )}
        {draft.condition === "habitDone" && (
          <Field label={t("Habit")}>
            <select className={inputCls} value={draft.habitId ?? ""} onChange={(e) => set({ habitId: e.target.value })}>
              <option value="">—</option>
              {sportHabits.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label={t("Analyze the last N days")} hint={t("Looks back over your existing history, so results appear right away.")}>
          <select
            className={inputCls}
            value={draft.days}
            onChange={(e) => set({ days: Number(e.target.value) })}
          >
            {[14, 30, 60, 90, 180, 365].map((n) => (
              <option key={n} value={n}>{t("last {n} days", { n })}</option>
            ))}
          </select>
        </Field>

        <details className="rounded-xl border border-[var(--border)] px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-[var(--text-muted)]">
            {t("Or start from a template")}
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.title}
                onClick={() =>
                  set({ title: tpl.title, hypothesis: tpl.hypothesis, metric: tpl.metric, condition: tpl.condition, threshold: tpl.threshold })
                }
                className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
              >
                {t(tpl.title)}
              </button>
            ))}
          </div>
        </details>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={() => onSave({ ...draft, title: draft.title.trim() || autoTitle(draft, t) })}>{t("Create")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function bedtimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h < 12 ? h + 24 : h) * 60 + m;
}
