"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarHeart, Droplet, HeartPulse, Minus, Pill, Plus, Save, Scale, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { HealthLog } from "@/lib/types";
import { SYMPTOMS, SYMPTOM_LABEL, SEVERITY_LABEL, Symptom } from "@/lib/health";
import { analyzeCycle, FLOW_LABEL } from "@/lib/cycle";
import { addDays, fmtLong, fmtShort, todayISO } from "@/lib/date";
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
    // Recovery days are mirrored into restDays so streaks are protected automatically.
    const rest = new Set(data.settings.restDays ?? []);
    if (log.recovering) rest.add(date);
    else rest.delete(date);
    updateSettings({ restDays: [...rest] });
    setFlash(true);
    setTimeout(() => setFlash(false), 1800);
  }

  const cycleOn = !!data.settings.cycleTracking;
  const meds = data.settings.medications ?? [];

  function toggleMed(name: string) {
    setLog((l) => {
      const cur = new Set(l.meds ?? []);
      if (cur.has(name)) cur.delete(name);
      else cur.add(name);
      return { ...l, meds: [...cur] };
    });
  }

  function setFlow(v: number) {
    setLog((l) => ({ ...l, period: l.period === v ? 0 : v }));
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
        <QuestionFlow log={log} setLog={setLog} cycleSymptom={cycleSymptom} onSave={save} t={t} flash={flash} cycleOn={cycleOn} meds={meds} toggleMed={toggleMed} setFlow={setFlow} />
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
            {cycleOn && (
              <div>
                <div className="mb-2 text-sm font-medium">{t("Menstrual flow")}</div>
                <FlowSelect value={log.period ?? 0} onChange={setFlow} t={t} />
              </div>
            )}
            {meds.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-medium">{t("Medications & supplements")}</div>
                <MedChips meds={meds} taken={log.meds ?? []} onToggle={toggleMed} t={t} />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
                <span className="text-sm font-medium">{t("Felt sick today")}</span>
                <Toggle checked={!!log.sick} onChange={(v) => setLog((l) => ({ ...l, sick: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
                <span className="text-sm font-medium">{t("Recovery day")}</span>
                <Toggle checked={!!log.recovering} onChange={(v) => setLog((l) => ({ ...l, recovering: v }))} />
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
            {log.recovering && (
              <p className="-mt-1 rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--text-muted)]">
                {t("Recovery days don't break your streaks — rest up.")}
              </p>
            )}
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

      <BodyMetricsCard />

      <WaterCard />

      <CycleCard />

      <MedicationsCard />

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

function bmiCategory(bmi: number): { key: string; color: string } {
  if (bmi < 18.5) return { key: "Underweight", color: "var(--info)" };
  if (bmi < 25) return { key: "Normal", color: "var(--good)" };
  if (bmi < 30) return { key: "Overweight", color: "var(--warn)" };
  return { key: "Obese", color: "var(--bad)" };
}

function BodyMetricsCard() {
  const { data, saveWeight } = useStore();
  const t = useT();
  const today = todayISO();
  const sorted = useMemo(() => [...data.weight].sort((a, b) => (a.date < b.date ? -1 : 1)), [data.weight]);
  const latest = sorted[sorted.length - 1];
  const height = data.settings.profile.heightCm;
  const [kg, setKg] = useState<string>(latest?.kg ? String(latest.kg) : "");

  const bmi = latest && height ? latest.kg / (height / 100) ** 2 : null;
  const cat = bmi ? bmiCategory(bmi) : null;
  const wTrend = sorted.slice(-90).map((w) => ({ date: w.date, value: w.kg }));

  function save() {
    const v = Number(kg);
    if (v > 0) saveWeight({ date: today, kg: Math.round(v * 10) / 10 });
  }

  return (
    <Card>
      <SectionTitle right={<Scale size={16} className="text-[var(--text-faint)]" />}>{t("Body metrics")}</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label={t("Weight today (kg)")}>
          <div className="flex gap-2">
            <input type="number" inputMode="decimal" min={0} step="0.1" className={inputCls} value={kg} onChange={(e) => setKg(e.target.value)} />
            <Button variant="soft" size="sm" onClick={save} disabled={!kg}>
              <Save size={15} /> {t("Save")}
            </Button>
          </div>
        </Field>
        <div className="flex gap-3">
          <div className="tile p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">{t("Latest")}</div>
            <div className="num mt-1 text-lg font-bold">{latest ? `${latest.kg} kg` : "—"}</div>
          </div>
          <div className="tile p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">BMI</div>
            <div className="num mt-1 text-lg font-bold" style={{ color: cat?.color }}>{bmi ? bmi.toFixed(1) : "—"}</div>
            {cat && <div className="text-[10px]" style={{ color: cat.color }}>{t(cat.key)}</div>}
          </div>
        </div>
      </div>
      {!height && (
        <p className="mt-2 text-xs text-[var(--text-faint)]">{t("Set your height in Settings → Profile to see your BMI.")}</p>
      )}
      {wTrend.length >= 2 && (
        <div className="mt-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{t("Weight · last 90 days")}</div>
          <TrendLine data={wTrend} color="var(--info)" unit="kg" name={t("Weight (kg)")} />
        </div>
      )}
    </Card>
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

/* ---------------- Water tracker ---------------- */

function WaterCard() {
  const { data, saveHealth, updateSettings } = useStore();
  const t = useT();
  const today = todayISO();
  const goal = data.settings.waterGoalGlasses;
  const [draft, setDraft] = useState(8);

  const existing = data.health.find((h) => h.date === today);
  const glasses = existing?.hydration ?? 0;
  function setGlasses(n: number) {
    const cur = existing ?? { date: today };
    saveHealth({ ...cur, hydration: Math.max(0, n) });
  }

  if (!goal) {
    return (
      <Card>
        <SectionTitle right={<Droplet size={16} className="text-[var(--text-faint)]" />}>{t("Water")}</SectionTitle>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-muted)]">{t("Set a daily water goal to track your glasses.")}</p>
          <div className="flex items-center gap-2">
            <input type="number" min={1} className={`${inputCls} w-16`} value={draft} onChange={(e) => setDraft(Number(e.target.value) || 8)} />
            <Button size="sm" onClick={() => updateSettings({ waterGoalGlasses: draft })}>{t("Activate")}</Button>
          </div>
        </div>
      </Card>
    );
  }

  const pct = Math.min(100, Math.round((glasses / goal) * 100));
  return (
    <Card>
      <SectionTitle
        right={
          <button onClick={() => updateSettings({ waterGoalGlasses: undefined })} className="text-xs text-[var(--text-faint)] hover:text-[var(--text)]">{t("Off")}</button>
        }
      >
        {t("Water")}
      </SectionTitle>
      <div className="flex items-center gap-4">
        <button onClick={() => setGlasses(glasses - 1)} disabled={glasses <= 0} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)] disabled:opacity-40">
          <Minus size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="num text-2xl font-bold">{glasses} / {goal}</div>
          <div className="text-xs text-[var(--text-muted)]">{t("glasses")}</div>
        </div>
        <button onClick={() => setGlasses(glasses + 1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
          <Plus size={18} />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: goal }).map((_, i) => (
          <Droplet key={i} size={18} className={i < glasses ? "fill-[var(--info)] text-[var(--info)]" : "text-[var(--surface-3)]"} />
        ))}
      </div>
      {glasses >= goal && <p className="mt-2 text-xs font-medium text-[var(--good)]">{t("Daily goal reached 🎉")}</p>}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ring-track)]">
        <div className="h-full rounded-full bg-[var(--info)]" style={{ width: `${pct}%` }} />
      </div>
    </Card>
  );
}

/* ---------------- Menstrual flow ---------------- */

const FLOW_COLOR: Record<number, string> = { 1: "#f472b6", 2: "#ec4899", 3: "#be185d" };

function FlowSelect({ value, onChange, t }: { value: number; onChange: (v: number) => void; t: (k: string) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(0)}
        className={clsx(
          "rounded-full border px-3 py-1.5 text-sm font-medium transition",
          value === 0 ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]",
        )}
      >
        {t("None")}
      </button>
      {[1, 2, 3].map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={clsx(
            "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition",
            value === v ? "border-transparent text-white" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]",
          )}
          style={value === v ? { background: FLOW_COLOR[v] } : undefined}
        >
          <Droplet size={13} className={value === v ? "" : "text-[var(--text-faint)]"} />
          {t(FLOW_LABEL[v])}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Medication chips ---------------- */

function MedChips({ meds, taken, onToggle, t }: { meds: string[]; taken: string[]; onToggle: (n: string) => void; t: (k: string) => string }) {
  const set = new Set(taken);
  return (
    <div className="flex flex-wrap gap-2">
      {meds.map((m) => {
        const on = set.has(m);
        return (
          <button
            key={m}
            onClick={() => onToggle(m)}
            className={clsx(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
              on ? "border-[var(--good)] bg-[var(--good)]/12 text-[var(--good)]" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]",
            )}
          >
            <Pill size={13} />
            {m}
          </button>
        );
      })}
      <span className="self-center text-xs text-[var(--text-faint)]">{t("Tap what you took")}</span>
    </div>
  );
}

/* ---------------- Cycle card ---------------- */

function CycleCard() {
  const { data, updateSettings } = useStore();
  const t = useT();
  const on = !!data.settings.cycleTracking;
  const info = useMemo(() => analyzeCycle(data.health, todayISO()), [data.health]);

  if (!on) {
    return (
      <Card>
        <SectionTitle right={<CalendarHeart size={16} className="text-[var(--text-faint)]" />}>{t("Cycle tracking")}</SectionTitle>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            {t("Track your menstrual cycle to log flow and see an estimated next period. Off by default.")}
          </p>
          <Button variant="soft" size="sm" onClick={() => updateSettings({ cycleTracking: true })}>{t("Enable")}</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle
        right={
          <button onClick={() => updateSettings({ cycleTracking: false })} className="text-xs text-[var(--text-faint)] hover:text-[var(--text)]">
            {t("Turn off")}
          </button>
        }
      >
        {t("Cycle")}
      </SectionTitle>
      {info.lastStart == null ? (
        <p className="py-4 text-center text-sm text-[var(--text-muted)]">
          {t("Log your flow on the days it happens to start seeing predictions here.")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CycleStat label={t("Cycle day")} value={info.cycleDay != null ? String(info.cycleDay) : "—"} />
            <CycleStat label={t("Avg length")} value={info.avgLength != null ? `${info.avgLength} ${t("days")}` : "—"} />
            <CycleStat
              label={t("Next (est.)")}
              value={info.nextPredicted ? fmtShort(info.nextPredicted) : "—"}
              sub={info.daysUntilNext != null ? (info.daysUntilNext >= 0 ? t("in {n} days", { n: info.daysUntilNext }) : t("{n} days ago", { n: Math.abs(info.daysUntilNext) })) : undefined}
            />
            <CycleStat label={t("Last period")} value={fmtShort(info.lastStart)} />
          </div>
          {info.periods.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{t("Recent periods")}</div>
              <div className="flex flex-wrap gap-2">
                {info.periods.slice(0, 6).map((p) => (
                  <span key={p.start} className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs">
                    {fmtShort(p.start)} · {p.length} {p.length === 1 ? t("day") : t("days")}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="mt-3 text-[11px] text-[var(--text-faint)]">{t("Estimates from your logs — not medical advice.")}</p>
        </>
      )}
    </Card>
  );
}

function CycleStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">{label}</div>
      <div className="num mt-0.5 text-base font-bold">{value}</div>
      {sub && <div className="text-[11px] text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}

/* ---------------- Medications management + adherence ---------------- */

function MedicationsCard() {
  const { data, updateSettings } = useStore();
  const t = useT();
  const meds = useMemo(() => data.settings.medications ?? [], [data.settings.medications]);
  const [name, setName] = useState("");

  function add() {
    const n = name.trim();
    if (!n || meds.some((m) => m.toLowerCase() === n.toLowerCase())) return;
    updateSettings({ medications: [...meds, n] });
    setName("");
  }
  function remove(m: string) {
    updateSettings({ medications: meds.filter((x) => x !== m) });
  }

  // 14-day adherence grid per medication.
  const days = useMemo(() => {
    const today = todayISO();
    return Array.from({ length: 14 }, (_, i) => addDays(today, -(13 - i)));
  }, []);
  const takenByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const h of data.health) if (h.meds?.length) map.set(h.date, new Set(h.meds));
    return map;
  }, [data.health]);

  return (
    <Card>
      <SectionTitle right={<Pill size={16} className="text-[var(--text-faint)]" />}>{t("Medications & supplements")}</SectionTitle>
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder={t("e.g. Vitamin D, Iron…")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
        />
        <Button variant="soft" size="sm" onClick={add} disabled={!name.trim()}>
          <Plus size={15} /> {t("Add")}
        </Button>
      </div>

      {meds.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          {t("Add the medications or supplements you take, then tick them off each day in your health check.")}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {meds.map((m) => {
            const takenCount = days.filter((d) => takenByDate.get(d)?.has(m)).length;
            return (
              <div key={m}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Pill size={13} className="text-[var(--text-faint)]" /> {m}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-faint)]">{takenCount}/14 {t("days")}</span>
                    <button onClick={() => remove(m)} className="text-[var(--text-faint)] hover:text-[var(--bad)]" aria-label={t("Delete")}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-[3px]">
                  {days.map((d) => {
                    const took = takenByDate.get(d)?.has(m);
                    return <span key={d} title={d} className="h-3.5 flex-1 rounded-[2px]" style={{ background: took ? "var(--good)" : "var(--surface-3)" }} />;
                  })}
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-[var(--text-faint)]">{t("Last 14 days · filled = taken.")}</p>
        </div>
      )}
    </Card>
  );
}

/* ---------------- Guided question flow ---------------- */

function QuestionFlow({
  log,
  setLog,
  cycleSymptom,
  onSave,
  t,
  flash,
  cycleOn,
  meds,
  toggleMed,
  setFlow,
}: {
  log: HealthLog;
  setLog: React.Dispatch<React.SetStateAction<HealthLog>>;
  cycleSymptom: (k: Symptom) => void;
  onSave: () => void;
  t: (k: string) => string;
  flash: boolean;
  cycleOn: boolean;
  meds: string[];
  toggleMed: (n: string) => void;
  setFlow: (v: number) => void;
}) {
  const [step, setStep] = useState(0);
  const steps = [
    "wellbeing",
    "symptoms",
    ...(cycleOn ? ["flow"] : []),
    ...(meds.length ? ["meds"] : []),
    "sick",
    "recovery",
    "note",
  ];
  const total = steps.length;
  const key = steps[Math.min(step, total - 1)];
  const last = step === total - 1;

  const questions: Record<string, string> = {
    wellbeing: t("How do you feel today?"),
    symptoms: t("Any symptoms?"),
    flow: t("Menstrual flow"),
    meds: t("Medications & supplements"),
    sick: t("Were you sick today?"),
    recovery: t("Recovery day"),
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
        {key === "flow" && (
          <>
            <p className="mb-2 text-xs text-[var(--text-muted)]">{t("Tap the level, or None.")}</p>
            <FlowSelect value={log.period ?? 0} onChange={setFlow} t={t} />
          </>
        )}
        {key === "meds" && (
          <>
            <p className="mb-2 text-xs text-[var(--text-muted)]">{t("Tap what you took")}</p>
            <MedChips meds={meds} taken={log.meds ?? []} onToggle={toggleMed} t={t} />
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
        {key === "recovery" && (
          <div className="flex gap-2">
            {[
              { v: false, label: t("Normal day") },
              { v: true, label: t("Recovery day") },
            ].map((o) => (
              <button
                key={String(o.v)}
                onClick={() => setLog((l) => ({ ...l, recovering: o.v }))}
                className={clsx(
                  "flex-1 rounded-xl border p-4 text-sm font-medium transition",
                  !!log.recovering === o.v ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-2)]",
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
