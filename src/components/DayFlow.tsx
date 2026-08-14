"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ListChecks,
  Moon,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { habitsForToday } from "@/lib/habitView";
import { computeDay, scoreColor, scoreLabel, sleepScore } from "@/lib/score";
import { addDays, fmtDuration, sleepDurationMinutes, todayISO } from "@/lib/date";
import { DailyReview, SleepLog } from "@/lib/types";
import { Button, ScaleInput, Field, inputCls, NumberInput } from "@/components/ui";
import { HabitRow } from "@/components/HabitRow";
import { AnimatedRing, RecapChecklist } from "@/components/Recap";
import { useDerived } from "@/lib/useDerived";
import { analyze } from "@/lib/analysis";
import { Lightbulb } from "lucide-react";

/* ------------------------------------------------------------------ *
 * Guided day-flow overlays.
 *   Evening: a short wrap-up (goals → reduce → check-in → overview →
 *            vs. yesterday → journal). Just a reminder — never wipes
 *            anything already entered during the day.
 *   Morning: only the sleep-entry prompt.
 * Both appear once per day inside a user-configured time window and can
 * be skipped at any point.
 * ------------------------------------------------------------------ */

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function inWindow(nowMin: number, from: string, to: string): boolean {
  const f = toMin(from);
  const tt = toMin(to);
  if (f <= tt) return nowMin >= f && nowMin <= tt;
  return nowMin >= f || nowMin <= tt; // window wraps past midnight
}

/** For a window that wraps past midnight, the early-morning tail still belongs to
 *  the previous calendar day, so the once-per-day marker stays stable. */
function eveningSessionDate(nowMin: number, from: string, to: string): string {
  const f = toMin(from);
  const tt = toMin(to);
  if (f > tt && nowMin <= tt) return addDays(todayISO(), -1);
  return todayISO();
}

export function DayFlow() {
  const { data, ready, updateSettings } = useStore();
  const df = data.settings.dayFlow;
  const [state, setState] = useState<{ decided: boolean; mode: null | "evening" | "morning" }>({
    decided: false,
    mode: null,
  });

  useEffect(() => {
    if (!ready || state.decided || !data.settings.onboardingComplete || !df) return;
    const now = new Date();
    const nm = now.getHours() * 60 + now.getMinutes();
    let mode: null | "evening" | "morning" = null;
    if (df.eveningEnabled && inWindow(nm, df.eveningFrom, df.eveningTo)) {
      if (df.lastEvening !== eveningSessionDate(nm, df.eveningFrom, df.eveningTo)) mode = "evening";
    }
    if (!mode && df.morningEnabled && inWindow(nm, df.morningFrom, df.morningTo)) {
      if (df.lastMorning !== todayISO()) mode = "morning";
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ decided: true, mode });
  }, [ready, state.decided, df, data.settings.onboardingComplete]);

  if (!state.mode || !df) return null;

  const close = () => {
    const now = new Date();
    const nm = now.getHours() * 60 + now.getMinutes();
    if (state.mode === "evening") {
      updateSettings({ dayFlow: { ...df, lastEvening: eveningSessionDate(nm, df.eveningFrom, df.eveningTo) } });
    } else {
      updateSettings({ dayFlow: { ...df, lastMorning: todayISO() } });
    }
    setState({ decided: true, mode: null });
  };

  return state.mode === "evening" ? <EveningFlow onClose={close} /> : <MorningFlow onClose={close} />;
}

/* ---------------- Shared shell ---------------- */

function FlowShell({
  title,
  subtitle,
  step,
  total,
  onBack,
  onClose,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  step: number;
  total: number;
  onBack?: () => void;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="card flex max-h-screen w-full flex-col overflow-hidden rounded-none sm:max-h-[92vh] sm:max-w-lg sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3.5">
          {onBack ? (
            <button onClick={onBack} className="text-[var(--text-muted)] hover:text-[var(--text)]">
              <ChevronLeft size={20} />
            </button>
          ) : (
            <div className="grad flex h-7 w-7 items-center justify-center rounded-lg text-white">
              <Sparkles size={15} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">{title}</div>
            {subtitle && <div className="truncate text-xs text-[var(--text-muted)]">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {/* Progress */}
        <div className="flex gap-1 px-5 pt-3">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "grad" : "bg-[var(--ring-track)]"}`}
            />
          ))}
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {/* Footer */}
        <div className="border-t border-[var(--border)] px-5 py-3.5">{footer}</div>
      </div>
    </div>
  );
}

/* ---------------- Evening flow ---------------- */

const blankReview = (date: string): DailyReview => ({
  date,
  productivity: 6,
  mood: 6,
  energy: 6,
  satisfaction: 6,
  discipline: 6,
});

const REVIEW_FIELDS: { key: keyof DailyReview; label: string }[] = [
  { key: "productivity", label: "Productivity" },
  { key: "mood", label: "Mood" },
  { key: "energy", label: "Energy" },
  { key: "satisfaction", label: "Satisfaction" },
  { key: "discipline", label: "Discipline" },
];

function EveningFlow({ onClose }: { onClose: () => void }) {
  const { data, saveReview, saveJournal } = useStore();
  const t = useT();
  const date = todayISO();

  const goals = habitsForToday(data, date);
  const build = goals.filter((g) => g.habit.kind === "build");
  const reduce = goals.filter((g) => g.habit.kind === "reduce");

  const existing = data.reviews.find((r) => r.date === date);
  const [review, setReview] = useState<DailyReview>(existing ?? blankReview(date));
  const [reviewTouched, setReviewTouched] = useState(false);
  const [journalText, setJournalText] = useState("");

  const [step, setStep] = useState(0);

  // Steps are assembled dynamically (reduce step only if there are reduce habits).
  const stepKeys = reduce.length > 0
    ? ["goals", "reduce", "checkin", "overview", "compare", "journal"]
    : ["goals", "checkin", "overview", "compare", "journal"];
  const total = stepKeys.length;
  const key = stepKeys[step];
  const isLast = step === total - 1;

  const comp = computeDay(data, date);
  const yComp = computeDay(data, addDays(date, -1));
  const score = comp.lifeScore ?? 0;
  const doneCount = build.filter((g) => g.log?.done).length;
  const slipCount = reduce.filter((g) => g.log?.done).length;

  function persistReview() {
    if (reviewTouched) saveReview({ ...review, date });
  }

  function next() {
    if (key === "checkin") persistReview();
    if (isLast) {
      persistReview();
      const body = journalText.trim();
      if (body) {
        saveJournal({
          id: "",
          date,
          title: "",
          body,
          tags: [],
          createdAt: "",
          updatedAt: "",
        });
      }
      onClose();
      return;
    }
    setStep((s) => s + 1);
  }

  const titles: Record<string, string> = {
    goals: t("Did you reach today's goals?"),
    reduce: t("Bad habits kept in check?"),
    checkin: t("How was your day?"),
    overview: t("Your day at a glance"),
    compare: t("Compared to yesterday"),
    journal: t("One more journal note?"),
  };

  return (
    <FlowShell
      title={t("End of day")}
      subtitle={titles[key]}
      step={step}
      total={total}
      onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            {t("Skip")}
          </button>
          <Button onClick={next}>
            {isLast ? (
              <>
                <Check size={16} /> {t("Done")}
              </>
            ) : (
              t("Continue")
            )}
          </Button>
        </div>
      }
    >
      {key === "goals" && (
        <StepIntro icon={<ListChecks size={18} />} hint={t("Tick what you actually did. Nothing here overwrites earlier entries.")}>
          {build.length === 0 ? (
            <Empty>{t("No habits scheduled today")}</Empty>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {build.map((g) => (
                <HabitRow key={g.habit.id} item={g} date={date} showAmount />
              ))}
            </div>
          )}
        </StepIntro>
      )}

      {key === "reduce" && (
        <StepIntro icon={<ListChecks size={18} />} hint={t("Tap only if the behavior happened today. Avoided by default.")}>
          <div className="divide-y divide-[var(--border)]">
            {reduce.map((g) => (
              <HabitRow key={g.habit.id} item={g} date={date} />
            ))}
          </div>
        </StepIntro>
      )}

      {key === "checkin" && (
        <div className="space-y-4">
          {REVIEW_FIELDS.map((f) => (
            <div key={f.key}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium">{t(f.label)}</span>
                <span className="text-sm font-semibold text-[var(--accent)]">{review[f.key] as number}</span>
              </div>
              <ScaleInput
                value={review[f.key] as number}
                onChange={(v) => {
                  setReview((r) => ({ ...r, [f.key]: v }));
                  setReviewTouched(true);
                }}
              />
            </div>
          ))}
          <Field label={t("Went well")}>
            <textarea
              className={inputCls}
              rows={2}
              value={review.wentWell ?? ""}
              onChange={(e) => {
                setReview((r) => ({ ...r, wentWell: e.target.value }));
                setReviewTouched(true);
              }}
            />
          </Field>
        </div>
      )}

      {key === "overview" && (
        <EveningOverview
          score={score}
          builds={build.map((g) => ({ id: g.habit.id, name: g.habit.name, done: !!g.log?.done }))}
          reduces={reduce.map((g) => ({ id: g.habit.id, name: g.habit.name, slipped: !!g.log?.done }))}
          doneLabel={`${doneCount}/${build.length}`}
          slipLabel={String(slipCount)}
          sleepLabel={sleepText(data, date) ?? "—"}
        />
      )}

      {key === "compare" && <CompareStep today={score} yesterday={yComp.lifeScore} t={t} />}

      {key === "journal" && (
        <StepIntro icon={<BookOpen size={18} />} hint={t("Optional — a sentence about today. Existing journal entries are untouched.")}>
          <textarea
            className={inputCls}
            rows={5}
            placeholder={t("What's worth remembering about today?")}
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
          />
        </StepIntro>
      )}
    </FlowShell>
  );
}

function CompareStep({
  today,
  yesterday,
  t,
}: {
  today: number;
  yesterday: number | null;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  if (!yesterday || yesterday <= 0) {
    return <Empty>{t("No score for yesterday to compare against yet.")}</Empty>;
  }
  const delta = today - yesterday;
  const up = delta >= 0;
  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-6">
        <div>
          <div className="text-xs text-[var(--text-faint)]">{t("Yesterday")}</div>
          <div className="num text-3xl font-bold" style={{ color: scoreColor(yesterday) }}>
            {yesterday}
          </div>
        </div>
        <div className="text-[var(--text-faint)]">→</div>
        <div>
          <div className="text-xs text-[var(--text-faint)]">{t("Today")}</div>
          <div className="num text-3xl font-bold" style={{ color: scoreColor(today) }}>
            {today}
          </div>
        </div>
      </div>
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
          up ? "bg-[var(--good-soft,rgba(22,163,74,.12))] text-[var(--good)]" : "bg-[rgba(220,38,38,.12)] text-[var(--bad)]"
        }`}
      >
        {up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
        {up ? "+" : ""}
        {delta} {t("points")}
      </div>
      <p className="text-sm text-[var(--text-muted)]">
        {delta === 0
          ? t("Right on par with yesterday.")
          : up
            ? t("A stronger day than yesterday — nice work.")
            : t("A quieter day than yesterday. Tomorrow's a fresh start.")}
      </p>
    </div>
  );
}

/* ---------------- Morning flow (sleep only) ---------------- */

const blankSleep = (date: string): SleepLog => ({
  date,
  bedTime: "23:00",
  wakeTime: "07:00",
  fallAsleepMinutes: 15,
  awakenings: 0,
  quality: 7,
  morningEnergy: 7,
});

function MorningFlow({ onClose }: { onClose: () => void }) {
  const { data, saveSleep } = useStore();
  const t = useT();
  const date = todayISO();
  const existing = data.sleep.find((s) => s.date === date);
  const [log, setLog] = useState<SleepLog>(existing ?? blankSleep(date));
  const name = data.settings.profile.name?.trim();

  function save() {
    saveSleep({ ...log, date });
    onClose();
  }

  const dur = sleepDurationMinutes(log.bedTime, log.wakeTime, log.fallAsleepMinutes ?? 0);

  return (
    <FlowShell
      title={t("Good morning")}
      subtitle={name ? t("Log last night's sleep, {name}.", { name }) : t("Log last night's sleep.")}
      step={0}
      total={1}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            {t("Skip")}
          </button>
          <Button onClick={save}>
            <Moon size={16} /> {t("Save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Bedtime")}>
            <input type="time" className={inputCls} value={log.bedTime} onChange={(e) => setLog((l) => ({ ...l, bedTime: e.target.value }))} />
          </Field>
          <Field label={t("Wake time")}>
            <input type="time" className={inputCls} value={log.wakeTime} onChange={(e) => setLog((l) => ({ ...l, wakeTime: e.target.value }))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Fall-asleep (min)")}>
            <NumberInput
              min={0}
              value={log.fallAsleepMinutes ?? 0}
              onChange={(n) => setLog((l) => ({ ...l, fallAsleepMinutes: n ?? 0 }))}
            />
          </Field>
          <Field label={t("Awakenings")}>
            <NumberInput
              min={0}
              value={log.awakenings ?? 0}
              onChange={(n) => setLog((l) => ({ ...l, awakenings: n ?? 0 }))}
            />
          </Field>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium">{t("Quality")}</span>
            <span className="text-sm font-semibold text-[var(--accent)]">{log.quality}</span>
          </div>
          <ScaleInput value={log.quality} onChange={(v) => setLog((l) => ({ ...l, quality: v }))} />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium">{t("Morning energy")}</span>
            <span className="text-sm font-semibold text-[var(--accent)]">{log.morningEnergy}</span>
          </div>
          <ScaleInput value={log.morningEnergy} onChange={(v) => setLog((l) => ({ ...l, morningEnergy: v }))} />
        </div>
        <div className="rounded-xl bg-[var(--surface-2)] p-3 text-sm">
          {t("Duration")}: <span className="font-semibold">{fmtDuration(dur)}</span>
          {" · "}
          {t("Sleep")} <span className="num font-bold text-[var(--good)]">{Math.round(sleepScore(log, data.settings.sleepTargetMinutes))}</span>
        </div>
      </div>
    </FlowShell>
  );
}

/* ---------------- small helpers ---------------- */

function EveningOverview({
  score,
  builds,
  reduces,
  doneLabel,
  slipLabel,
  sleepLabel,
}: {
  score: number;
  builds: { id: string; name: string; done: boolean }[];
  reduces: { id: string; name: string; slipped: boolean }[];
  doneLabel: string;
  slipLabel: string;
  sleepLabel: string;
}) {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setPlay(true), 80);
    return () => clearTimeout(id);
  }, []);
  const tip = useMemo(() => {
    const r = analyze(data, d.history, data.settings.language);
    return r.findings.find((f) => f.kind === "tip" || f.kind === "insight") ?? null;
  }, [data, d.history]);
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <AnimatedRing value={score} size={168} play={play} sublabel={score > 0 ? t(scoreLabel(score)) : t("No data yet")} />
        <div className="mt-1 text-xs text-[var(--text-muted)]">{t("Life Score")}</div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MiniTile label={t("goals done")} value={doneLabel} />
        <MiniTile label={t("Watch-list")} value={slipLabel} />
        <MiniTile label={t("Sleep")} value={sleepLabel} />
      </div>
      <RecapChecklist builds={builds} reduces={reduces} play={play} />
      {tip && (
        <div className={play ? "recap-pop flex items-start gap-2.5 rounded-xl bg-[var(--accent-soft)] p-3" : "opacity-0"} style={play ? { animationDelay: "600ms" } : undefined}>
          <Lightbulb size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
          <p className="text-[13px] leading-snug text-[var(--text)]">{tip.detail}</p>
        </div>
      )}
    </div>
  );
}

function sleepText(data: ReturnType<typeof useStore>["data"], date: string): string | null {
  const s = data.sleep.find((x) => x.date === date);
  return s ? fmtDuration(sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0)) : null;
}

function StepIntro({ icon, hint, children }: { icon: React.ReactNode; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 rounded-xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <p className="text-[13px] leading-snug">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-[var(--text-muted)]">{children}</p>;
}

function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile p-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">{label}</div>
      <div className="num mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
