"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic, Sparkles, Check, ListChecks, X, Square, ArrowUpRight, Send,
  Settings2, ChevronLeft, ChevronRight, HeartPulse, Compass, Wallet, Dumbbell, BookOpen, Minus, Plus,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { todayISO } from "@/lib/date";
import { habitsForToday } from "@/lib/habitView";
import { WHEEL_DIMS, blankWheelScores } from "@/lib/wheel";
import { captureActions } from "@/lib/ai";
import { runCoachTool } from "@/lib/coachTools";
import { DASHBOARD_CARDS } from "@/lib/dashboardCards";
import { DailyReview } from "@/lib/types";
import { Modal, Button, Toggle, ScaleInput, Field, inputCls } from "@/components/ui";
import { HabitRow } from "@/components/HabitRow";
import { Dictate } from "@/components/QuickLog";

const ERROR_MSG: Record<string, string> = {
  not_configured: "The AI isn't set up yet. Add your Groq API key in the coach setup.",
  rate_limited: "You've made several AI requests in a short time. The free AI has a per-minute limit — wait about a minute and try again.",
  provider_error: "The AI provider returned an error. Try again shortly.",
  network: "Couldn't reach the AI service. Check your connection and try again.",
  empty: "The AI didn't return anything — try rephrasing.",
};

/** Two fixed top-right controls: the mic (voice/AI capture) and, below it, a labelled
 *  "Quick capture" button that opens the manual, tap-to-check panels. */
export function QuickCaptureButton() {
  const t = useT();
  const [voice, setVoice] = useState(false);
  const [manual, setManual] = useState(false);
  return (
    <>
      <button
        onClick={() => setVoice(true)}
        aria-label={t("Voice log")}
        className="fixed right-14 top-2.5 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] transition hover:border-[var(--accent)]"
      >
        <Mic size={16} className="text-[var(--accent)]" />
      </button>
      <button
        onClick={() => setManual(true)}
        className="fixed right-3 top-[50px] z-50 flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--text)] shadow-[var(--shadow)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <ListChecks size={14} className="text-[var(--accent)]" />
        {t("Quick capture")}
      </button>
      {voice && <VoiceCaptureModal onClose={() => setVoice(false)} />}
      {manual && <ManualCaptureModal onClose={() => setManual(false)} />}
    </>
  );
}

/* ============================ VOICE / AI CAPTURE ============================ */

/** Categories the guided mode walks through. */
const GUIDED: { key: string; label: string; placeholder: string }[] = [
  { key: "habits", label: "Habits", placeholder: "e.g. meditated, read 20 min" },
  { key: "sleep", label: "Sleep", placeholder: "e.g. slept 7.5h, good quality" },
  { key: "training", label: "Training", placeholder: "e.g. ran 30 min" },
  { key: "health", label: "Health", placeholder: "e.g. 6 glasses of water, 74 kg" },
  { key: "finances", label: "Finances", placeholder: "e.g. spent 40 on groceries" },
  { key: "mood", label: "Mood & energy", placeholder: "e.g. mood 8, energy 7" },
  { key: "other", label: "Anything else", placeholder: "e.g. adjust my dashboard, add vacation…" },
];

type Stage = "input" | "loading" | "done";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = any;

function VoiceCaptureModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const { data } = store;
  const t = useT();
  const router = useRouter();
  const [guided, setGuided] = useState(false);
  const [text, setText] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<Stage>("input");
  const [err, setErr] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [reply, setReply] = useState("");
  const [navTarget, setNavTarget] = useState<string | null>(null);
  const [followText, setFollowText] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const engagedRef = useRef(false);

  const recRef = useRef<Rec>(null);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalRef = useRef("");
  const lastFinalRef = useRef("");
  const displayRef = useRef("");
  const stageRef = useRef<Stage>("input");
  stageRef.current = stage;
  displayRef.current = text;

  const lang = data.settings.language;

  function clearSilence() {
    if (silenceRef.current) {
      clearTimeout(silenceRef.current);
      silenceRef.current = null;
    }
  }

  function stopListening() {
    clearSilence();
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  function armSilence() {
    clearSilence();
    silenceRef.current = setTimeout(() => {
      stopListening();
      const said = (displayRef.current || finalRef.current).trim();
      if (said && stageRef.current === "input") runWith(said);
    }, 3500);
  }

  async function ensureMic(): Promise<void> {
    try {
      const md = navigator.mediaDevices;
      if (md?.getUserMedia) {
        const stream = await md.getUserMedia({ audio: true });
        stream.getTracks().forEach((tr) => tr.stop());
      }
    } catch {
      /* denied or unsupported — recognition may still prompt on its own */
    }
  }

  async function startListening() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    await ensureMic();
    const rec: Rec = new SR();
    rec.lang = navigator.language || (lang === "de" ? "de-DE" : "en-US");
    rec.interimResults = false;
    rec.continuous = true;
    finalRef.current = text.trim();
    lastFinalRef.current = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r.isFinal) continue;
        const chunk = (r[0]?.transcript ?? "").trim();
        if (!chunk) continue;
        const last = lastFinalRef.current;
        if (chunk === last) continue;
        if (last && chunk.startsWith(last) && finalRef.current.endsWith(last)) {
          finalRef.current = finalRef.current.slice(0, finalRef.current.length - last.length).trimEnd();
        }
        finalRef.current = (finalRef.current ? finalRef.current + " " : "") + chunk;
        lastFinalRef.current = chunk;
      }
      setText(finalRef.current);
      armSilence();
    };
    rec.onspeechstart = () => clearSilence();
    rec.onspeechend = () => armSilence();
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      armSilence();
    } catch {
      setListening(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!SR);
    if (SR && !guided) {
      const id = setTimeout(startListening, 150);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopListening(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stage !== "done" || navTarget) return;
    const id = setTimeout(() => {
      if (!engagedRef.current) onClose();
    }, 5000);
    return () => clearTimeout(id);
  }, [stage, navTarget, onClose]);

  function composedGuided(): string {
    return GUIDED.filter((g) => fields[g.key]?.trim())
      .map((g) => `${t(g.label)}: ${fields[g.key].trim()}`)
      .join("\n");
  }
  function composed(): string {
    return (guided ? composedGuided() : text).trim();
  }

  async function runWith(content: string) {
    if (!content || stageRef.current === "loading") return;
    stopListening();
    setErr(null);
    setFollowText("");
    engagedRef.current = false;
    setStage("loading");

    const habitNames = data.habits.filter((h) => !h.archived).map((h) => h.name).join(", ") || "none";
    const ctx = [
      `Today: ${todayISO()}`,
      `The user's habit names: ${habitNames}`,
      `Dashboard card ids that can be shown/hidden: ${DASHBOARD_CARDS.join(", ")}`,
    ].join("\n");

    const res = await captureActions(content, ctx, lang);
    if (res.error) {
      setErr(res.error);
      setStage("input");
      return;
    }

    const done: string[] = [];
    let navigated: string | null = null;
    for (const act of res.actions ?? []) {
      const result = runCoachTool(store, act.do, act as Record<string, unknown>, {
        navigate: (href) => {
          navigated = href;
        },
      });
      if (act.do !== "navigate" && !/^(Error|No habit|No page|Unknown)/.test(result)) {
        done.push(result);
      }
    }
    const finalText = res.reply ?? "";

    if (navigated && done.length === 0) {
      onClose();
      router.push(navigated);
      return;
    }

    setActions(done);
    setReply(finalText);
    setNavTarget(navigated);
    setStage("done");
  }

  function run() {
    runWith(composed());
  }

  return (
    <Modal open onClose={onClose} title={t("Voice log")}>
      {stage === "done" ? (
        <div className="py-1">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--good)]/15 text-[var(--good)]">
            <Check size={26} />
          </div>
          {reply && <p className="mb-3 text-center text-sm text-[var(--text-muted)]">{reply}</p>}
          {actions.length > 0 ? (
            <div className="flex flex-col gap-1.5 text-left">
              {actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-2)] p-3 text-sm">
                  <Check size={15} className="shrink-0 text-[var(--good)]" />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          ) : (
            !reply && <p className="text-center text-sm text-[var(--text-muted)]">{t("Nothing was recorded — try rephrasing.")}</p>
          )}

          {navTarget && (
            <Button
              className="mt-3 w-full"
              onClick={() => { const to = navTarget; onClose(); router.push(to); }}
            >
              <ArrowUpRight size={16} /> {t("Open now")}
            </Button>
          )}

          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <p className="mb-1.5 text-[12px] text-[var(--text-muted)]">
              {t("Anything else? Log more, open a page, or change a setting.")}
            </p>
            <div className="flex items-center gap-2">
              <input
                value={followText}
                onChange={(e) => { setFollowText(e.target.value); engagedRef.current = true; }}
                onFocus={() => { engagedRef.current = true; }}
                placeholder={t("Say or type another command")}
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
                onKeyDown={(e) => { if (e.key === "Enter" && followText.trim()) runWith(followText.trim()); }}
              />
              <Dictate onText={(tx) => { engagedRef.current = true; setFollowText((s) => (s ? s + " " : "") + tx); }} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="soft" className="flex-1" onClick={onClose}>{t("Done")}</Button>
              <Button className="flex-1" disabled={!followText.trim()} onClick={() => runWith(followText.trim())}>
                <Send size={15} /> {t("Send to AI")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            {t("Speak or type what you did — the AI logs it for you. You can also ask it to open a page, change a setting, add vacation days or adjust your dashboard.")}
          </p>

          <label className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-2)] p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <ListChecks size={16} className="text-[var(--accent)]" /> {t("Ask by category")}
            </span>
            <Toggle checked={guided} onChange={(v) => { setGuided(v); if (v) stopListening(); }} />
          </label>

          {guided ? (
            <div className="space-y-3">
              {GUIDED.map((g) => (
                <div key={g.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[13px] font-medium">{t(g.label)}</span>
                    <Dictate onText={(tx) => setFields((f) => ({ ...f, [g.key]: (f[g.key] ? f[g.key] + " " : "") + tx }))} />
                  </div>
                  <div className="relative">
                    <input
                      value={fields[g.key] ?? ""}
                      onChange={(e) => setFields((f) => ({ ...f, [g.key]: e.target.value }))}
                      placeholder={t(g.placeholder)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-3 pr-8 text-sm outline-none focus:border-[var(--accent)]"
                    />
                    {fields[g.key] && (
                      <button
                        onClick={() => setFields((f) => ({ ...f, [g.key]: "" }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text)]"
                        aria-label={t("Clear")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {listening && (
                <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[var(--accent)]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                  </span>
                  {t("Listening… pause when you're done")}
                </div>
              )}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                autoFocus
                placeholder={t("What happened today?")}
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm outline-none focus:border-[var(--accent)]"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
              />
              {!supported && (
                <p className="mt-2 text-[11px] text-[var(--text-faint)]">
                  {t("Voice input needs Chrome (or another Chromium browser). You can still type here.")}
                </p>
              )}
            </>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            {!guided && supported ? (
              listening ? (
                <Button variant="soft" onClick={stopListening}>
                  <Square size={14} /> {t("Stop")}
                </Button>
              ) : (
                <Button variant="soft" onClick={startListening}>
                  <Mic size={16} /> {t("Speak")}
                </Button>
              )
            ) : (
              <span />
            )}
            <Button disabled={!composed() || stage === "loading"} onClick={run}>
              {stage === "loading" ? (
                <><Sparkles size={16} className="animate-pulse" /> {t("Working…")}</>
              ) : (
                <><Check size={16} /> {t("Send to AI")}</>
              )}
            </Button>
          </div>
          {err && <p className="mt-3 rounded-xl bg-[var(--bad)]/10 px-3 py-2 text-xs text-[var(--bad)]">{t(ERROR_MSG[err] ?? ERROR_MSG.network)}</p>}
        </div>
      )}
    </Modal>
  );
}

/* ============================ MANUAL CAPTURE (tap to check off) ============================ */

type SectionKey = "habits" | "health" | "wheel" | "finances" | "training" | "journal";
const SECTION_DEFS: { key: SectionKey; label: string; hint: string; icon: typeof ListChecks }[] = [
  { key: "habits", label: "Habits", hint: "Done or avoided — plus optional mood & energy", icon: ListChecks },
  { key: "health", label: "Health", hint: "Wellbeing, water, weight", icon: HeartPulse },
  { key: "wheel", label: "Wheel of Life", hint: "Rate your life areas", icon: Compass },
  { key: "finances", label: "Finances", hint: "Bought something today?", icon: Wallet },
  { key: "training", label: "Training", hint: "Trained today?", icon: Dumbbell },
  { key: "journal", label: "Journal", hint: "Anything to note?", icon: BookOpen },
];
const DEFAULT_SECTIONS: SectionKey[] = ["habits", "health", "wheel", "finances", "training", "journal"];

/** Sections that first ask a yes/no before showing their form. */
const GATE_QUESTION: Partial<Record<SectionKey, string>> = {
  finances: "Anything to log in Finances?",
  training: "Trained today?",
  journal: "Anything to note?",
};

function ManualCaptureModal({ onClose }: { onClose: () => void }) {
  const { data, updateSettings } = useStore();
  const t = useT();
  const qc = data.settings.quickCapture;
  const [configuring, setConfiguring] = useState(!qc?.configured);
  const enabled = (qc?.sections ?? DEFAULT_SECTIONS) as SectionKey[];

  // Wizard state
  const steps = SECTION_DEFS.filter((s) => enabled.includes(s.key));
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<SectionKey, "yes" | "no">>>({});

  function toggleSection(k: SectionKey) {
    const next = enabled.includes(k) ? enabled.filter((x) => x !== k) : [...enabled, k];
    updateSettings({ quickCapture: { sections: next, configured: qc?.configured ?? false } });
  }
  function finishConfig() {
    updateSettings({ quickCapture: { sections: enabled, configured: true } });
    setI(0);
    setConfiguring(false);
  }

  const gear = !configuring && qc?.configured ? (
    <Button variant="ghost" size="sm" onClick={() => setConfiguring(true)} aria-label={t("Configure")}>
      <Settings2 size={17} />
    </Button>
  ) : undefined;

  if (configuring) {
    return (
      <Modal open onClose={onClose} title={t("Quick capture")} headerRight={gear} wide>
        <div>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            {t("Choose what you'd like to quick-log. You can change this anytime with the gear icon.")}
          </p>
          <div className="flex flex-col gap-2">
            {SECTION_DEFS.map((s) => {
              const Icon = s.icon;
              const on = enabled.includes(s.key);
              return (
                <label key={s.key} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-2)] p-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon size={18} className="shrink-0 text-[var(--accent)]" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{t(s.label)}</span>
                      <span className="block text-[12px] text-[var(--text-muted)]">{t(s.hint)}</span>
                    </span>
                  </span>
                  <Toggle checked={on} onChange={() => toggleSection(s.key)} />
                </label>
              );
            })}
          </div>
          <Button className="mt-4 w-full" onClick={finishConfig}>{t("Save")}</Button>
        </div>
      </Modal>
    );
  }

  if (steps.length === 0) {
    return (
      <Modal open onClose={onClose} title={t("Quick capture")} headerRight={gear} wide>
        <p className="py-4 text-center text-sm text-[var(--text-muted)]">
          {t("No sections enabled. Tap the gear to choose some.")}
        </p>
        <Button className="w-full" onClick={onClose}>{t("Done")}</Button>
      </Modal>
    );
  }

  const step = steps[Math.min(i, steps.length - 1)];
  const Icon = step.icon;
  const gateQ = GATE_QUESTION[step.key];
  const answered = answers[step.key];
  const showForm = !gateQ || answered === "yes";
  const isLast = i >= steps.length - 1;

  function go(delta: number) {
    const n = i + delta;
    if (n < 0) return;
    if (n >= steps.length) { onClose(); return; }
    setI(n);
  }
  function answer(v: "yes" | "no") {
    setAnswers((a) => ({ ...a, [step.key]: v }));
    if (v === "no") go(1);
  }

  return (
    <Modal open onClose={onClose} title={t("Quick capture")} headerRight={gear} wide>
      {/* progress */}
      <div className="mb-3 flex items-center gap-1.5">
        {steps.map((s, idx) => (
          <span
            key={s.key}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: idx <= i ? "var(--accent)" : "var(--ring-track)" }}
          />
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold">{t(step.label)}</div>
          <div className="text-[12px] text-[var(--text-faint)]">{t("Step {n} of {m}", { n: i + 1, m: steps.length })}</div>
        </div>
      </div>

      <div className="min-h-[80px]">
        {gateQ && answered !== "yes" ? (
          <div className="py-2">
            <p className="mb-3 text-sm font-medium">{t(gateQ)}</p>
            <div className="flex gap-2">
              <Button variant="soft" className="flex-1" onClick={() => answer("no")}>{t("No")}</Button>
              <Button className="flex-1" onClick={() => answer("yes")}>{t("Yes")}</Button>
            </div>
          </div>
        ) : showForm ? (
          <>
            {step.key === "habits" && <HabitsPanel />}
            {step.key === "health" && <HealthPanel />}
            {step.key === "wheel" && <WheelPanel />}
            {step.key === "finances" && <FinancePanel />}
            {step.key === "training" && <TrainingPanel />}
            {step.key === "journal" && <JournalPanel />}
          </>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-3">
        <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => go(-1)}>
          <ChevronLeft size={16} /> {t("Back")}
        </Button>
        <span className="flex-1" />
        <Button onClick={() => go(1)}>
          {isLast ? t("Finish") : t("Next")} {!isLast && <ChevronRight size={16} />}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------- small saved-flash helper ---------- */
function useFlash() {
  const [saved, setSaved] = useState(false);
  return { saved, flash: () => { setSaved(true); setTimeout(() => setSaved(false), 1600); } };
}
function SaveRow({ onSave, saved, t }: { onSave: () => void; saved: boolean; t: (k: string) => string }) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <Button size="sm" onClick={onSave}><Check size={15} /> {t("Save")}</Button>
      {saved && <span className="text-sm text-[var(--good)]">{t("Saved ✓")}</span>}
    </div>
  );
}

/* ---------- Habits ---------- */
const CHECKIN_FIELDS: { key: keyof DailyReview; label: string }[] = [
  { key: "productivity", label: "Productivity" },
  { key: "mood", label: "Mood" },
  { key: "energy", label: "Energy" },
  { key: "satisfaction", label: "Satisfaction" },
  { key: "discipline", label: "Discipline" },
];
function HabitsPanel() {
  const { data, saveReview } = useStore();
  const t = useT();
  const today = todayISO();
  const goals = useMemo(() => habitsForToday(data, today), [data, today]);
  const build = goals.filter((g) => g.habit.kind === "build");
  const reduce = goals.filter((g) => g.habit.kind === "reduce");
  const existing = data.reviews.find((r) => r.date === today);
  const [showCheckin, setShowCheckin] = useState(!!existing);
  const [review, setReview] = useState<DailyReview>(
    existing ?? { date: today, productivity: 6, mood: 6, energy: 6, satisfaction: 6, discipline: 6 },
  );
  const { saved, flash } = useFlash();

  return (
    <div>
      {build.length === 0 && reduce.length === 0 ? (
        <p className="py-2 text-sm text-[var(--text-muted)]">{t("No habits scheduled today")}.</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {build.map((g) => <HabitRow key={g.habit.id} item={g} date={today} showAmount />)}
          {reduce.map((g) => <HabitRow key={g.habit.id} item={g} date={today} />)}
        </div>
      )}
      <label className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-2)] px-3 py-2">
        <span className="text-sm font-medium">{t("Add mood & energy")}</span>
        <Toggle checked={showCheckin} onChange={setShowCheckin} />
      </label>
      {showCheckin && (
        <div className="mt-3 space-y-3">
          {CHECKIN_FIELDS.map((f) => (
            <div key={f.key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[13px] font-medium">{t(f.label)}</span>
                <span className="text-[13px] font-semibold text-[var(--accent)]">{review[f.key] as number}</span>
              </div>
              <ScaleInput value={review[f.key] as number} onChange={(v) => setReview((r) => ({ ...r, [f.key]: v }))} />
            </div>
          ))}
          <SaveRow saved={saved} t={t} onSave={() => { saveReview({ ...review, date: today }); flash(); }} />
        </div>
      )}
    </div>
  );
}

/* ---------- Health ---------- */
function HealthPanel() {
  const { data, saveHealth, saveWeight } = useStore();
  const t = useT();
  const today = todayISO();
  const existing = data.health.find((h) => h.date === today);
  const [wellbeing, setWellbeing] = useState(existing?.wellbeing ?? 7);
  const [water, setWater] = useState(existing?.hydration ?? 0);
  const [weight, setWeight] = useState<string>(
    data.weight.find((w) => w.date === today)?.kg?.toString() ?? "",
  );
  const { saved, flash } = useFlash();

  function save() {
    saveHealth({ ...(existing ?? { date: today }), date: today, wellbeing, hydration: water });
    const kg = parseFloat(weight.replace(",", "."));
    if (Number.isFinite(kg) && kg > 20 && kg < 400) saveWeight({ date: today, kg: Math.round(kg * 10) / 10 });
    flash();
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-medium">{t("Wellbeing")}</span>
          <span className="text-[13px] font-semibold text-[var(--accent)]">{wellbeing}</span>
        </div>
        <ScaleInput value={wellbeing} onChange={setWellbeing} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium">{t("Water")}</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setWater((w) => Math.max(0, w - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]"><Minus size={15} /></button>
          <span className="num w-6 text-center text-sm font-semibold">{water}</span>
          <button onClick={() => setWater((w) => w + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]"><Plus size={15} /></button>
        </div>
      </div>
      <Field label={t("Weight today (kg)")}>
        <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="—" className={inputCls} />
      </Field>
      <SaveRow saved={saved} t={t} onSave={save} />
    </div>
  );
}

/* ---------- Wheel ---------- */
function WheelPanel() {
  const { data, saveWheelCheck } = useStore();
  const t = useT();
  const today = todayISO();
  const latest = [...data.wheelChecks].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const [scores, setScores] = useState<Record<string, number>>(latest?.scores ?? blankWheelScores());
  const { saved, flash } = useFlash();
  return (
    <div className="space-y-3">
      {WHEEL_DIMS.map((d) => (
        <div key={d.key}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[13px] font-medium">{t(d.label)}</span>
            <span className="text-[13px] font-semibold text-[var(--accent)]">{scores[d.key] ?? 5}</span>
          </div>
          <ScaleInput value={scores[d.key] ?? 5} onChange={(v) => setScores((s) => ({ ...s, [d.key]: v }))} />
        </div>
      ))}
      <SaveRow saved={saved} t={t} onSave={() => { saveWheelCheck({ id: "", date: today, scores }); flash(); }} />
    </div>
  );
}

/* ---------- Finances ---------- */
function FinancePanel() {
  const { saveTransaction } = useStore();
  const t = useT();
  const today = todayISO();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const { saved, flash } = useFlash();
  function save() {
    const amt = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) return;
    saveTransaction({ id: "", date: today, type, category: category.trim() || (type === "income" ? "Income" : "General"), amount: Math.round(amt * 100) / 100 });
    setAmount(""); setCategory("");
    flash();
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant={type === "expense" ? "primary" : "soft"} className="flex-1" onClick={() => setType("expense")}>{t("Expense")}</Button>
        <Button size="sm" variant={type === "income" ? "primary" : "soft"} className="flex-1" onClick={() => setType("income")}>{t("Income")}</Button>
      </div>
      <div className="flex gap-2">
        <Field label={t("Amount")}><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0" className={inputCls} /></Field>
        <Field label={t("Category")}><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("e.g. Groceries")} className={inputCls} /></Field>
      </div>
      <SaveRow saved={saved} t={t} onSave={save} />
    </div>
  );
}

/* ---------- Training ---------- */
function TrainingPanel() {
  const { saveWorkout } = useStore();
  const t = useT();
  const today = todayISO();
  const [sport, setSport] = useState("");
  const [minutes, setMinutes] = useState("");
  const { saved, flash } = useFlash();
  function save() {
    if (!sport.trim()) return;
    const min = Math.max(1, Math.round(parseFloat(minutes) || 45));
    saveWorkout({ id: "", date: today, sport: sport.trim(), durationMin: min, exercises: [] });
    setSport(""); setMinutes("");
    flash();
  }
  return (
    <div className="space-y-3">
      <Field label={t("Sport")}><input value={sport} onChange={(e) => setSport(e.target.value)} placeholder={t("e.g. Running")} className={inputCls} /></Field>
      <Field label={t("Minutes")}><input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" placeholder="45" className={inputCls} /></Field>
      <SaveRow saved={saved} t={t} onSave={save} />
    </div>
  );
}

/* ---------- Journal ---------- */
function JournalPanel() {
  const { saveJournal } = useStore();
  const t = useT();
  const today = todayISO();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { saved, flash } = useFlash();
  function save() {
    if (!body.trim()) return;
    const now = new Date().toISOString();
    saveJournal({ id: "", date: today, title: title.trim() || t("Quick note"), body: body.trim(), createdAt: now, updatedAt: now });
    setTitle(""); setBody("");
    flash();
  }
  return (
    <div className="space-y-3">
      <Field label={t("Title")}><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Optional")} className={inputCls} /></Field>
      <Field label={t("Entry")}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={t("What's on your mind?")} className={`${inputCls} resize-none`} />
      </Field>
      <div className="flex items-center gap-2">
        <Dictate onText={(tx) => setBody((s) => (s ? s + " " : "") + tx)} />
      </div>
      <SaveRow saved={saved} t={t} onSave={save} />
    </div>
  );
}
