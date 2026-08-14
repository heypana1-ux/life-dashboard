"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarCheck,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Lightbulb,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { periodRecap, weekRange, weekAnchor } from "@/lib/recap";
import { analyze } from "@/lib/analysis";
import { fmtShort, todayISO } from "@/lib/date";
import { scoreLabel } from "@/lib/score";
import { AnimatedRing } from "@/components/Recap";
import { Button, inputCls } from "@/components/ui";

/*
  A guided weekly review — the Sunday ritual. Walks through: the week in numbers,
  what went well, what was hard, how it felt, and an intention for next week. The
  result is saved as a WeeklyReview so past weeks can be looked back on.
*/

const RATINGS: { v: number; emoji: string; label: string }[] = [
  { v: 1, emoji: "😞", label: "Rough" },
  { v: 2, emoji: "😕", label: "Meh" },
  { v: 3, emoji: "😐", label: "Okay" },
  { v: 4, emoji: "🙂", label: "Good" },
  { v: 5, emoji: "😄", label: "Great" },
];

export function WeeklyReviewFlow({ anchor, onClose }: { anchor: string; onClose: () => void }) {
  const { data, saveWeeklyReview } = useStore();
  const d = useDerived();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const existing = data.weeklyReviews.find((r) => r.weekOf === anchor);
  const prev = useMemo(
    () =>
      data.weeklyReviews
        .filter((r) => r.weekOf < anchor)
        .sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1))[0],
    [data.weeklyReviews, anchor],
  );

  const range = useMemo(() => weekRange(anchor), [anchor]);
  const rec = useMemo(() => periodRecap(data, d.byDate, range.start, range.end), [data, d.byDate, range]);

  const tips = useMemo(() => {
    const report = analyze(data, d.history, data.settings.language);
    return report.findings.filter((f) => f.kind === "tip" || f.kind === "strength").slice(0, 2);
  }, [data, d.history]);

  const [step, setStep] = useState(0);
  const [wins, setWins] = useState(existing?.wins ?? "");
  const [challenges, setChallenges] = useState(existing?.challenges ?? "");
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [focus, setFocus] = useState(existing?.focus ?? "");

  const [play, setPlay] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setPlay(true), 80);
    return () => clearTimeout(id);
  }, []);

  const STEPS = 5;
  const last = step === STEPS - 1;

  function finish() {
    saveWeeklyReview({
      weekOf: anchor,
      rating: rating || 3,
      wins: wins.trim() || undefined,
      challenges: challenges.trim() || undefined,
      focus: focus.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="card flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="grad flex h-8 w-8 items-center justify-center rounded-lg text-white">
              <CalendarCheck size={16} />
            </span>
            <div>
              <div className="text-sm font-semibold leading-tight">{t("Weekly review")}</div>
              <div className="text-[11px] text-[var(--text-faint)]">
                {fmtShort(range.start)} – {fmtShort(range.end)}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text)]" aria-label={t("Close")}>
            <X size={18} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 py-3">
          {Array.from({ length: STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-[var(--accent)]" : "bg-[var(--ring-track)]"}`}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-0.5 pb-1">
          {/* Step 0 — the week in numbers */}
          {step === 0 && (
            <div className="text-center">
              <div className="flex flex-col items-center">
                <AnimatedRing value={rec.avgScore} play={play} size={150} stroke={13} sublabel={rec.avgScore > 0 ? t(scoreLabel(rec.avgScore)) : t("No data yet")} />
                <div className="mt-1 text-xs text-[var(--text-muted)]">{t("Average Life Score")}</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-left">
                <MiniTile icon={Flame} label={t("Days logged")} value={`${rec.daysLogged}/${rec.totalDays}`} />
                <MiniTile icon={Target} label={t("Habit completion")} value={`${rec.habitRate}%`} />
                <MiniTile icon={Dumbbell} label={t("Workouts")} value={String(rec.workouts)} />
                <MiniTile icon={Sparkles} label={t("Best day")} value={rec.bestDay ? String(rec.bestDay.score) : "—"} />
              </div>
              {prev?.focus && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-[var(--accent-soft)] p-3 text-left">
                  <Lightbulb size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                  <div className="text-[13px] leading-snug">
                    <span className="font-semibold">{t("Last week's focus:")}</span> {prev.focus}
                  </div>
                </div>
              )}
              {tips.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {tips.map((tip) => (
                    <div key={tip.id} className="flex items-start gap-2 rounded-xl bg-[var(--surface-2)] p-2.5 text-left">
                      <Sparkles size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                      <span className="text-[12.5px] leading-snug text-[var(--text-muted)]">{tip.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 1 — wins */}
          {step === 1 && (
            <ReflectStep
              emoji="🎉"
              title={t("What went well this week?")}
              hint={t("Wins, big or small. What are you proud of?")}
              value={wins}
              onChange={setWins}
              placeholder={t("e.g. Trained three times, stuck to my sleep routine…")}
            />
          )}

          {/* Step 2 — challenges */}
          {step === 2 && (
            <ReflectStep
              emoji="🧗"
              title={t("What was challenging?")}
              hint={t("What got in the way, and what did you learn?")}
              value={challenges}
              onChange={setChallenges}
              placeholder={t("e.g. Skipped workouts when work got busy…")}
            />
          )}

          {/* Step 3 — rating */}
          {step === 3 && (
            <div className="py-2 text-center">
              <div className="text-3xl">📊</div>
              <h3 className="mt-2 text-lg font-semibold">{t("How did the week feel overall?")}</h3>
              <div className="mt-5 flex justify-center gap-2">
                {RATINGS.map((r) => (
                  <button
                    key={r.v}
                    onClick={() => setRating(r.v)}
                    className={`flex h-14 w-14 flex-col items-center justify-center rounded-2xl border text-2xl transition ${
                      rating === r.v
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] scale-110"
                        : "border-[var(--border)] bg-[var(--surface-2)] opacity-70 hover:opacity-100"
                    }`}
                    aria-label={t(r.label)}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <div className="mt-3 text-sm font-medium text-[var(--text-muted)]">{t(RATINGS[rating - 1].label)}</div>
              )}
            </div>
          )}

          {/* Step 4 — focus for next week */}
          {step === 4 && (
            <ReflectStep
              emoji="🎯"
              title={t("Your focus for next week")}
              hint={t("One or two things you want to prioritise. You'll see this at your next review.")}
              value={focus}
              onChange={setFocus}
              placeholder={t("e.g. Protect my mornings, one more workout…")}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>{t("Back")}</Button>
          ) : (
            <span />
          )}
          {last ? (
            <Button onClick={finish}>
              <Check size={16} /> {t("Finish review")}
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)}>
              {t("Next")} <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MiniTile({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="tile p-3">
      <div className="flex items-center gap-1.5 text-[var(--text-faint)]">
        <Icon size={12} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.05em]">{label}</span>
      </div>
      <div className="num mt-0.5 text-lg font-bold">{value}</div>
    </div>
  );
}

function ReflectStep({
  emoji,
  title,
  hint,
  value,
  onChange,
  placeholder,
}: {
  emoji: string;
  title: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="py-1">
      <div className="text-center text-3xl">{emoji}</div>
      <h3 className="mt-2 text-center text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-xs text-center text-[13px] text-[var(--text-muted)]">{hint}</p>
      <textarea
        autoFocus
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} mt-4 resize-none`}
      />
    </div>
  );
}

/* ---------------- Sunday prompt gate ---------------- */

/**
 * On Sundays, offer the guided review once per week via a dismissible banner.
 * Reused as a manual entry point elsewhere by rendering <WeeklyReviewFlow/> directly.
 */
export function WeeklyReviewGate() {
  const { data, ready, updateSettings } = useStore();
  const t = useT();
  const df = data.settings.dayFlow;
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const today = todayISO();
  const anchor = weekAnchor(today);
  const isSunday = new Date().getDay() === 0;
  const doneThisWeek = data.weeklyReviews.some((r) => r.weekOf === anchor);
  const promptedThisWeek = df?.lastGuidedReview === anchor;

  // Show the banner on Sundays if not yet done and not already dismissed this week.
  const show =
    ready &&
    data.settings.onboardingComplete &&
    isSunday &&
    !doneThisWeek &&
    !dismissed &&
    !promptedThisWeek;

  if (open) {
    return <WeeklyReviewFlow anchor={anchor} onClose={() => setOpen(false)} />;
  }

  if (!show) return null;

  const markSeen = () => {
    setDismissed(true);
    if (df) updateSettings({ dayFlow: { ...df, lastGuidedReview: anchor } });
  };

  const start = () => {
    markSeen();
    setOpen(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] px-3 pb-[calc(env(safe-area-inset-bottom,0)+0.75rem)] sm:bottom-4 sm:left-auto sm:right-4 sm:px-0">
      <div className="card mx-auto flex max-w-md items-center gap-3 rounded-2xl border-[var(--accent)]/30 shadow-[var(--shadow)] sm:mx-0">
        <span className="grad flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
          <CalendarCheck size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{t("Time for your weekly review")}</div>
          <div className="text-xs text-[var(--text-muted)]">{t("Take two minutes to reflect on your week.")}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" onClick={start}>{t("Start")}</Button>
          <button onClick={markSeen} className="rounded-lg p-1.5 text-[var(--text-faint)] hover:text-[var(--text)]" aria-label={t("Dismiss")}>
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
