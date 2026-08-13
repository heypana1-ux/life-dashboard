"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, HeartPulse, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { HealthLog } from "@/lib/types";
import { SYMPTOMS, SYMPTOM_LABEL, SEVERITY_LABEL, Symptom } from "@/lib/health";
import { fmtLong, todayISO } from "@/lib/date";
import { useT } from "@/lib/i18n";
import { Card, PageHeader, SectionTitle, Button, Field, inputCls, ScaleInput, Badge, Toggle } from "@/components/ui";
import { TrendLine } from "@/components/charts";
import clsx from "clsx";

const blank = (date: string): HealthLog => ({ date, wellbeing: 7, symptoms: {}, sick: false });

export default function HealthPage() {
  const { data, saveHealth, updateSettings } = useStore();
  const t = useT();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const existing = data.health.find((h) => h.date === date);
  const [log, setLog] = useState<HealthLog>(existing ?? blank(date));
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLog(data.health.find((h) => h.date === date) ?? blank(date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const mode = data.settings.healthMode ?? "form";

  function cycleSymptom(key: Symptom) {
    setLog((l) => {
      const cur = l.symptoms?.[key] ?? 0;
      const next = (cur + 1) % 4; // 0→1→2→3→0
      const symptoms = { ...(l.symptoms ?? {}) };
      if (next === 0) delete symptoms[key];
      else symptoms[key] = next;
      return { ...l, symptoms };
    });
  }

  function save() {
    saveHealth({ ...log, date });
    setFlash(true);
    setTimeout(() => setFlash(false), 1800);
  }

  const trend = useMemo(() => {
    return [...data.health]
      .filter((h) => h.wellbeing != null)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(-30)
      .map((h) => ({ date: h.date, value: h.wellbeing as number }));
  }, [data.health]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Health")}
        subtitle={fmtLong(date)}
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-[var(--surface-2)] p-1 text-sm">
              {(["form", "questions"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => updateSettings({ healthMode: m })}
                  className={clsx("rounded-lg px-3 py-1.5 font-medium transition", mode === m ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)]")}
                >
                  {m === "form" ? t("Form") : t("Questions")}
                </button>
              ))}
            </div>
            <input
              type="date"
              max={today}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm outline-none"
            />
          </div>
        }
      />

      <p className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-muted)]">
        {t("Health is tracked and correlated with the rest of your data, but never counts toward your Life Score.")}
      </p>

      {mode === "questions" ? (
        <QuestionFlow log={log} setLog={setLog} cycleSymptom={cycleSymptom} onSave={save} t={t} flash={flash} />
      ) : (
        <Card>
          <SectionTitle right={existing ? <Badge tone="good">{t("Logged")}</Badge> : <Badge>{t("New")}</Badge>}>
            {t("Daily health check")}
          </SectionTitle>
          <div className="space-y-5">
            <WellbeingField log={log} setLog={setLog} t={t} />
            <div>
              <div className="mb-2 text-sm font-medium">{t("Symptoms")}</div>
              <SymptomGrid log={log} cycleSymptom={cycleSymptom} t={t} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
                <span className="text-sm font-medium">{t("Felt sick today")}</span>
                <Toggle checked={!!log.sick} onChange={(v) => setLog((l) => ({ ...l, sick: v }))} />
              </div>
              <Field label={t("Water (glasses)")}>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className={inputCls}
                  value={log.hydration ?? ""}
                  onChange={(e) => setLog((l) => ({ ...l, hydration: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </Field>
            </div>
            <Field label={t("Note")}>
              <textarea className={inputCls} rows={2} value={log.note ?? ""} onChange={(e) => setLog((l) => ({ ...l, note: e.target.value }))} />
            </Field>
            <div className="flex items-center gap-3">
              <Button onClick={save}>
                <Save size={16} /> {t("Save")}
              </Button>
              {flash && <span className="text-sm text-[var(--good)]">{t("Saved ✓")}</span>}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle right={<Activity size={16} className="text-[var(--text-faint)]" />}>{t("Wellbeing · last 30 days")}</SectionTitle>
        {trend.length >= 2 ? (
          <TrendLine data={trend} color="var(--good)" domain={[1, 10]} name={t("Wellbeing")} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">{t("Log a few days to see your wellbeing trend.")}</p>
        )}
      </Card>
    </div>
  );
}

function WellbeingField({ log, setLog, t }: { log: HealthLog; setLog: React.Dispatch<React.SetStateAction<HealthLog>>; t: (k: string) => string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium">{t("Overall wellbeing")}</span>
        <span className="text-sm font-semibold text-[var(--accent)]">{log.wellbeing ?? 7}/10</span>
      </div>
      <ScaleInput value={log.wellbeing ?? 7} onChange={(v) => setLog((l) => ({ ...l, wellbeing: v }))} />
    </div>
  );
}

function SymptomGrid({ log, cycleSymptom, t }: { log: HealthLog; cycleSymptom: (k: Symptom) => void; t: (k: string) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SYMPTOMS.map((key) => {
        const sev = log.symptoms?.[key] ?? 0;
        return (
          <button
            key={key}
            onClick={() => cycleSymptom(key)}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              sev === 0
                ? "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]"
                : "border-transparent text-white",
            )}
            style={sev > 0 ? { background: SEV_COLOR[sev] } : undefined}
          >
            {t(SYMPTOM_LABEL[key])}
            {sev > 0 && <span className="ml-1.5 opacity-90">· {t(SEVERITY_LABEL[sev])}</span>}
          </button>
        );
      })}
    </div>
  );
}

const SEV_COLOR: Record<number, string> = {
  1: "#d97706",
  2: "#ea580c",
  3: "#dc2626",
};

/* ---------------- Guided question flow ---------------- */

function QuestionFlow({
  log,
  setLog,
  cycleSymptom,
  onSave,
  t,
  flash,
}: {
  log: HealthLog;
  setLog: React.Dispatch<React.SetStateAction<HealthLog>>;
  cycleSymptom: (k: Symptom) => void;
  onSave: () => void;
  t: (k: string) => string;
  flash: boolean;
}) {
  const [step, setStep] = useState(0);
  const steps = ["wellbeing", "symptoms", "sick", "note"];
  const total = steps.length;
  const key = steps[step];
  const last = step === total - 1;

  const questions: Record<string, string> = {
    wellbeing: t("How do you feel today?"),
    symptoms: t("Any symptoms?"),
    sick: t("Were you sick today?"),
    note: t("Anything to note?"),
  };

  return (
    <Card>
      <div className="mb-4 flex gap-1">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "grad" : "bg-[var(--ring-track)]"}`} />
        ))}
      </div>
      <div className="mb-4 flex items-center gap-2 text-[var(--accent)]">
        <HeartPulse size={18} />
        <span className="text-lg font-semibold">{questions[key]}</span>
      </div>

      <div className="min-h-[120px]">
        {key === "wellbeing" && <WellbeingField log={log} setLog={setLog} t={t} />}
        {key === "symptoms" && (
          <>
            <p className="mb-2 text-xs text-[var(--text-muted)]">{t("Tap to add · tap again for stronger.")}</p>
            <SymptomGrid log={log} cycleSymptom={cycleSymptom} t={t} />
          </>
        )}
        {key === "sick" && (
          <div className="flex gap-2">
            {[
              { v: false, label: t("No, fine") },
              { v: true, label: t("Yes, sick") },
            ].map((o) => (
              <button
                key={String(o.v)}
                onClick={() => setLog((l) => ({ ...l, sick: o.v }))}
                className={clsx(
                  "flex-1 rounded-xl border p-4 text-sm font-medium transition",
                  !!log.sick === o.v ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-2)]",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        {key === "note" && (
          <textarea className={inputCls} rows={3} placeholder={t("Optional")} value={log.note ?? ""} onChange={(e) => setLog((l) => ({ ...l, note: e.target.value }))} />
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          {t("Back")}
        </Button>
        {last ? (
          <Button onClick={onSave}>
            <Save size={16} /> {t("Save")}
          </Button>
        ) : (
          <Button onClick={() => setStep((s) => s + 1)}>{t("Continue")}</Button>
        )}
      </div>
      {flash && <p className="mt-2 text-center text-sm text-[var(--good)]">{t("Saved ✓")}</p>}
    </Card>
  );
}
