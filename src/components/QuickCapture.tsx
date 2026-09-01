"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic, Sparkles, Check, Settings2, ChevronDown, ArrowUpRight, Send,
  ListChecks, HeartPulse, Compass, Wallet, Dumbbell, BookOpen, Minus, Plus,
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

/** Fixed voice/quick-capture button — top-right corner, next to the profile avatar. */
export function QuickCaptureButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("Quick capture")}
        className="fixed right-14 top-2.5 z-50 flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] shadow-[var(--shadow)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <Mic size={15} className="text-[var(--accent)]" />
        <span className="hidden sm:inline">{t("Quick capture")}</span>
      </button>
      {open && <QuickCaptureModal onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickCaptureModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const { data, updateSettings } = store;
  const t = useT();
  const router = useRouter();

  const qc = data.settings.quickCapture;
  const [configuring, setConfiguring] = useState(!qc?.configured);
  const enabled = (qc?.sections ?? DEFAULT_SECTIONS) as SectionKey[];

  // Voice / AI line
  const [text, setText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiActions, setAiActions] = useState<string[]>([]);
  const [aiReply, setAiReply] = useState("");
  const [navTarget, setNavTarget] = useState<string | null>(null);

  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  async function sendAI() {
    const content = text.trim();
    if (!content || aiBusy) return;
    setAiErr(null);
    setAiBusy(true);
    setAiActions([]);
    setAiReply("");
    setNavTarget(null);

    const habitNames = data.habits.filter((h) => !h.archived).map((h) => h.name).join(", ") || "none";
    const ctx = [
      `Today: ${todayISO()}`,
      `The user's habit names: ${habitNames}`,
      `Dashboard card ids that can be shown/hidden: ${DASHBOARD_CARDS.join(", ")}`,
    ].join("\n");

    const res = await captureActions(content, ctx, data.settings.language);
    setAiBusy(false);
    if (res.error) {
      setAiErr(res.error);
      return;
    }
    const done: string[] = [];
    let nav: string | null = null;
    for (const act of res.actions ?? []) {
      const result = runCoachTool(store, act.do, act as Record<string, unknown>, { navigate: (href) => { nav = href; } });
      if (act.do !== "navigate" && !/^(Error|No habit|No page|Unknown)/.test(result)) done.push(result);
    }
    setAiActions(done);
    setAiReply(res.reply ?? "");
    setNavTarget(nav);
    setText("");
  }

  function toggleSection(k: SectionKey) {
    const next = enabled.includes(k) ? enabled.filter((x) => x !== k) : [...enabled, k];
    updateSettings({ quickCapture: { sections: next, configured: qc?.configured ?? false } });
  }
  function finishConfig() {
    updateSettings({ quickCapture: { sections: enabled, configured: true } });
    setConfiguring(false);
  }

  const gear = !configuring && qc?.configured ? (
    <Button variant="ghost" size="sm" onClick={() => setConfiguring(true)} aria-label={t("Configure")}>
      <Settings2 size={17} />
    </Button>
  ) : undefined;

  return (
    <Modal open onClose={onClose} title={t("Quick capture")} headerRight={gear} wide>
      {configuring ? (
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
      ) : (
        <div className="flex flex-col gap-3">
          {/* Voice / AI line */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("Speak or type anything — the AI logs it")}
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                onKeyDown={(e) => { if (e.key === "Enter") sendAI(); }}
              />
              <Dictate onText={(tx) => setText((s) => (s ? s + " " : "") + tx)} />
              <Button size="sm" disabled={!text.trim() || aiBusy} onClick={sendAI}>
                {aiBusy ? <Sparkles size={15} className="animate-pulse" /> : <Send size={15} />}
              </Button>
            </div>
            {(aiActions.length > 0 || aiReply || aiErr || navTarget) && (
              <div className="mt-2.5">
                {aiReply && <p className="mb-1.5 text-[13px] text-[var(--text-muted)]">{aiReply}</p>}
                {aiActions.map((a, i) => (
                  <div key={i} className="mb-1 flex items-center gap-2 text-[13px]">
                    <Check size={14} className="shrink-0 text-[var(--good)]" /> <span>{a}</span>
                  </div>
                ))}
                {navTarget && (
                  <Button size="sm" variant="soft" className="mt-1" onClick={() => { const to = navTarget; onClose(); router.push(to); }}>
                    <ArrowUpRight size={15} /> {t("Open now")}
                  </Button>
                )}
                {aiErr && <p className="text-[12px] text-[var(--bad)]">{t(ERROR_MSG[aiErr] ?? ERROR_MSG.network)}</p>}
              </div>
            )}
          </div>

          {/* Section panels */}
          {SECTION_DEFS.filter((s) => enabled.includes(s.key)).map((s) => {
            const Icon = s.icon;
            const isOpen = openSection === s.key;
            return (
              <div key={s.key} className="overflow-hidden rounded-xl border border-[var(--border)]">
                <button
                  onClick={() => setOpenSection(isOpen ? null : s.key)}
                  className="flex w-full items-center gap-2.5 px-3 py-3 text-left transition hover:bg-[var(--surface-2)]"
                >
                  <Icon size={18} className="shrink-0 text-[var(--accent)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t(s.label)}</span>
                    <span className="block text-[12px] text-[var(--text-muted)]">{t(s.hint)}</span>
                  </span>
                  <ChevronDown size={18} className={`shrink-0 text-[var(--text-faint)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-[var(--border)] p-3">
                    {s.key === "habits" && <HabitsPanel />}
                    {s.key === "health" && <HealthPanel />}
                    {s.key === "wheel" && <WheelPanel />}
                    {s.key === "finances" && <FinancePanel />}
                    {s.key === "training" && <TrainingPanel />}
                    {s.key === "journal" && <JournalPanel />}
                  </div>
                )}
              </div>
            );
          })}

          <Button variant="soft" className="w-full" onClick={onClose}>{t("Done")}</Button>
        </div>
      )}
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
