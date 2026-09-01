"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mic, Sparkles, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { todayISO } from "@/lib/date";
import { logFromText, parseQuickLog, ParsedLog } from "@/lib/ai";
import { JournalEntry, Workout } from "@/lib/types";
import { Modal, Button } from "@/components/ui";

const ERROR_MSG: Record<string, string> = {
  not_configured: "The AI isn't set up yet. Add your Groq API key in the coach setup.",
  rate_limited: "The free AI limit was hit for now — try again in a minute.",
  provider_error: "The AI provider returned an error. Try again shortly.",
  network: "Couldn't reach the AI service. Check your connection and try again.",
  empty: "Couldn't read anything to log — try rephrasing.",
  none: "I couldn't find anything loggable in that — try naming a habit, your sleep, mood, a workout, water or weight.",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Bed/wake times that yield the given sleep duration, assuming a 07:00 wake-up. */
function sleepFromHours(hours: number): { bedTime: string; wakeTime: string } {
  let mins = 7 * 60 - Math.round(hours * 60);
  mins = ((mins % 1440) + 1440) % 1440;
  return { bedTime: `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`, wakeTime: "07:00" };
}

export function QuickLogButton({ className }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="soft" className={className} onClick={() => setOpen(true)}>
        <Wand2 size={16} /> {t("Quick log")}
      </Button>
      {open && <QuickLogModal onClose={() => setOpen(false)} />}
    </>
  );
}

type Stage = "input" | "loading" | "preview" | "done";

function QuickLogModal({ onClose }: { onClose: () => void }) {
  const { data, saveReview, saveSleep, setHabitLog, saveWorkout, saveHealth, saveWeight, saveJournal } = useStore();
  const t = useT();
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [err, setErr] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedLog | null>(null);
  const [applied, setApplied] = useState<string[]>([]);

  async function analyze() {
    const content = text.trim();
    if (!content) return;
    setErr(null);
    setStage("loading");
    const names = data.habits.filter((h) => !h.archived).map((h) => `${h.name} (${h.kind})`).join(", ");
    const res = await logFromText(content, names, data.settings.language);
    if (res.error) {
      setErr(res.error);
      setStage("input");
      return;
    }
    const p = res.reply ? parseQuickLog(res.reply) : null;
    if (!p) {
      setErr("none");
      setStage("input");
      return;
    }
    setParsed(p);
    setStage("preview");
  }

  function matchHabit(name: string) {
    const lower = name.toLowerCase();
    const active = data.habits.filter((h) => !h.archived);
    return (
      active.find((h) => h.name.toLowerCase() === lower) ||
      active.find((h) => h.name.toLowerCase().includes(lower) || lower.includes(h.name.toLowerCase()))
    );
  }

  function apply() {
    if (!parsed) return;
    const today = todayISO();
    const done: string[] = [];

    if (parsed.review) {
      const existing = data.reviews.find((r) => r.date === today);
      const base = existing ?? { date: today, productivity: 6, mood: 6, energy: 6, satisfaction: 6, discipline: 6 };
      saveReview({ ...base, ...parsed.review, date: today });
      done.push(t("Check-in"));
    }
    if (parsed.sleepHours) {
      const { bedTime, wakeTime } = sleepFromHours(parsed.sleepHours);
      const existing = data.sleep.find((s) => s.date === today);
      saveSleep({
        date: today,
        bedTime,
        wakeTime,
        fallAsleepMinutes: existing?.fallAsleepMinutes,
        awakenings: existing?.awakenings,
        quality: parsed.sleepQuality ?? existing?.quality ?? 7,
        morningEnergy: existing?.morningEnergy ?? 7,
      });
      done.push(t("Sleep"));
    }
    if (parsed.habits?.length) {
      let any = false;
      for (const h of parsed.habits) {
        const m = matchHabit(h.name);
        if (!m) continue;
        any = true;
        const extra = m.timesPerDay && h.done ? { count: m.timesPerDay } : {};
        setHabitLog({ habitId: m.id, date: today, done: h.done, ...extra });
      }
      if (any) done.push(t("Habits"));
    }
    if (parsed.workout) {
      const w: Workout = { id: "", date: today, sport: parsed.workout.sport, durationMin: parsed.workout.minutes ?? 30, exercises: [] };
      saveWorkout(w);
      done.push(t("Training"));
    }
    if (parsed.water != null) {
      const existing = data.health.find((h) => h.date === today);
      saveHealth({ ...(existing ?? { date: today }), date: today, hydration: parsed.water });
      done.push(t("Water"));
    }
    if (parsed.weightKg != null) {
      saveWeight({ date: today, kg: parsed.weightKg });
      done.push(t("Weight"));
    }
    if (parsed.journal) {
      const now = new Date().toISOString();
      const entry: JournalEntry = { id: "", date: today, title: t("Quick note"), body: parsed.journal, createdAt: now, updatedAt: now };
      saveJournal(entry);
      done.push(t("Journal"));
    }
    setApplied(done);
    setStage("done");
  }

  return (
    <Modal open onClose={onClose} title={t("Quick log")}>
      {stage === "done" ? (
        <div className="py-2 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--good)]/15 text-[var(--good)]">
            <Check size={26} />
          </div>
          <p className="text-sm font-medium">{t("Logged for today")}</p>
          {applied.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {applied.map((a) => (
                <span key={a} className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium">{a}</span>
              ))}
            </div>
          )}
          <Button className="mt-5 w-full" onClick={onClose}>{t("Done")}</Button>
        </div>
      ) : stage === "preview" && parsed ? (
        <div>
          {parsed.note && <p className="mb-3 text-sm text-[var(--text-muted)]">{parsed.note}</p>}
          <div className="space-y-2">
            {summaryLines(parsed, t, (n) => !!matchHabit(n)).map((line, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-2)] p-3 text-sm">
                <Check size={15} className="shrink-0 text-[var(--good)]" />
                <span>{line}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[var(--text-faint)]">{t("Everything is dated today. Applying overwrites today's values for these entries.")}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="soft" className="flex-1" onClick={() => setStage("input")}>{t("Back")}</Button>
            <Button className="flex-1" onClick={apply}><Check size={16} /> {t("Apply")}</Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            {t("Type or speak your day in plain words — e.g. “slept 7h, mood 8, did meditation, ran 30 min”. The AI turns it into entries.")}
          </p>
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              autoFocus
              placeholder={t("What happened today?")}
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm outline-none focus:border-[var(--accent)]"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze(); }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Dictate onText={(tx) => setText((s) => (s ? s + " " : "") + tx)} />
            <Button disabled={!text.trim() || stage === "loading"} onClick={analyze}>
              {stage === "loading" ? (
                <>
                  <Sparkles size={16} className="animate-pulse" /> {t("Reading…")}
                </>
              ) : (
                <>
                  <Wand2 size={16} /> {t("Log it")}
                </>
              )}
            </Button>
          </div>
          {err && <p className="mt-3 rounded-xl bg-[var(--bad)]/10 px-3 py-2 text-xs text-[var(--bad)]">{t(ERROR_MSG[err] ?? ERROR_MSG.network)}</p>}
        </div>
      )}
    </Modal>
  );
}

/** Human-readable summary of what will be logged. */
function summaryLines(p: ParsedLog, t: (k: string, v?: Record<string, string | number>) => string, habitExists: (name: string) => boolean): string[] {
  const lines: string[] = [];
  if (p.review) {
    const parts = Object.entries(p.review).map(([k, v]) => `${t(cap(k))} ${v}`);
    lines.push(`${t("Check-in")}: ${parts.join(", ")}`);
  }
  if (p.sleepHours) lines.push(`${t("Sleep")}: ${p.sleepHours}h${p.sleepQuality ? ` · ${t("Quality")} ${p.sleepQuality}/10` : ""}`);
  if (p.habits?.length) {
    const known = p.habits.filter((h) => habitExists(h.name));
    for (const h of known) lines.push(`${h.done ? t("Done") : t("Not done")}: ${h.name}`);
  }
  if (p.workout) lines.push(`${t("Training")}: ${p.workout.sport}${p.workout.minutes ? ` · ${p.workout.minutes} min` : ""}`);
  if (p.water != null) lines.push(`${t("Water")}: ${p.water}`);
  if (p.weightKg != null) lines.push(`${t("Weight")}: ${p.weightKg} kg`);
  if (p.journal) lines.push(`${t("Journal")}: ${p.journal.slice(0, 80)}${p.journal.length > 80 ? "…" : ""}`);
  return lines;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Dictate({ onText }: { onText: (t: string) => void }) {
  const t = useT();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!SR);
  }, []);

  function toggle() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let txt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      if (txt.trim()) onText(txt.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  if (!supported) return <span />;
  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
        listening ? "border-[var(--bad)] bg-[var(--bad)]/10 text-[var(--bad)]" : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
      }`}
    >
      <Mic size={14} /> {listening ? t("Listening… tap to stop") : t("Dictate")}
    </button>
  );
}
