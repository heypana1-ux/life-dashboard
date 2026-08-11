"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Experiment, ExperimentCondition, ExperimentMetric } from "@/lib/types";
import { evaluateExperiment } from "@/lib/experiments";
import { fmtDuration, todayISO } from "@/lib/date";
import { Card, PageHeader, Button, Modal, Field, inputCls, EmptyState, Badge } from "@/components/ui";

const METRICS: ExperimentMetric[] = ["lifeScore", "productivity", "mood", "energy", "sleep"];
const CONDITIONS: ExperimentCondition[] = ["bedtimeBefore", "sleepAtLeast", "trained", "habitDone"];

const METRIC_LABEL: Record<ExperimentMetric, string> = {
  lifeScore: "Life Score",
  productivity: "Productivity",
  mood: "Mood",
  energy: "Energy",
  sleep: "Sleep",
};
const CONDITION_LABEL: Record<ExperimentCondition, string> = {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Experiments")}
        subtitle={t("Test a hypothesis against your own data — correlation, not proof.")}
        action={
          <Button onClick={() => setModal(true)}>
            <Plus size={16} /> {t("New experiment")}
          </Button>
        }
      />

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
        <Badge>
          {res.daysElapsed}/{exp.days} {t("days")}
        </Badge>
      </div>

      <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-3">
        {!res.enough ? (
          <p className="text-sm text-[var(--text-muted)]">
            {t("Not enough data yet ({met} vs {not} days). Keep logging.", { met: res.nMet, not: res.nNot })}
          </p>
        ) : (
          <>
            <p className="text-sm">
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

function conditionText(exp: Experiment, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (exp.condition === "bedtimeBefore") {
    const mins = exp.threshold ?? 24 * 60;
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return t("Bedtime before {time}", { time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` });
  }
  if (exp.condition === "sleepAtLeast") return t("Sleep ≥ {dur}", { dur: fmtDuration(exp.threshold ?? 450) });
  if (exp.condition === "trained") return t("On days I train");
  return t("A specific habit is done");
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
    condition: "bedtimeBefore",
    threshold: 24 * 60,
    startDate: todayISO(),
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
        <div>
          <div className="mb-1.5 text-sm font-medium text-[var(--text-muted)]">{t("Start from a template")}</div>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.title}
                onClick={() =>
                  set({ title: tpl.title, hypothesis: tpl.hypothesis, metric: tpl.metric, condition: tpl.condition, threshold: tpl.threshold })
                }
                className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
              >
                {tpl.title}
              </button>
            ))}
          </div>
        </div>

        <Field label={t("Title")}>
          <input className={inputCls} value={draft.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
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

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Start date")}>
            <input type="date" className={inputCls} value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </Field>
          <Field label={t("Duration (days)")}>
            <input type="number" min={7} className={inputCls} value={draft.days} onChange={(e) => set({ days: Number(e.target.value) })} />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={() => draft.title.trim() && onSave(draft)} disabled={!draft.title.trim()}>{t("Create")}</Button>
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
