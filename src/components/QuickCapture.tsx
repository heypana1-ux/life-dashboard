"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Sparkles, Check, ListChecks, X, Square, ArrowUpRight, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { todayISO } from "@/lib/date";
import { askCoachAgent, AgentMsg } from "@/lib/ai";
import { runCoachTool } from "@/lib/coachTools";
import { DASHBOARD_CARDS } from "@/lib/dashboardCards";
import { Modal, Button, Toggle } from "@/components/ui";
import { Dictate } from "@/components/QuickLog";

const ERROR_MSG: Record<string, string> = {
  not_configured: "The AI isn't set up yet. Add your Groq API key in the coach setup.",
  rate_limited: "You've made several AI requests in a short time. The free AI has a per-minute limit — wait about a minute and try again.",
  provider_error: "The AI provider returned an error. Try again shortly.",
  network: "Couldn't reach the AI service. Check your connection and try again.",
  empty: "The AI didn't return anything — try rephrasing.",
};

/** Fixed voice/quick-capture button that sits in the top-right corner next to the profile avatar. */
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

function QuickCaptureModal({ onClose }: { onClose: () => void }) {
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

  // Auto-stop after a few seconds of silence, then auto-submit what was heard (finals plus any
  // trailing interim shown in the box).
  function armSilence() {
    clearSilence();
    silenceRef.current = setTimeout(() => {
      stopListening();
      const said = (displayRef.current || finalRef.current).trim();
      if (said && stageRef.current === "input") runWith(said);
    }, 3500);
  }

  /** Prime the microphone permission so browsers (esp. desktop) actually show the prompt.
   *  Harmless if already granted or unsupported. */
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
    // interimResults=false is deliberate: some Android engines (e.g. Samsung) emit growing
    // partials as separate results, which made the transcript repeat and pile up. Only
    // finalized segments are delivered here, each appended exactly once.
    rec.interimResults = false;
    rec.continuous = true;
    // Dictation appends to whatever is already in the box.
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
        if (chunk === last) continue; // exact re-emit → ignore
        if (last && chunk.startsWith(last) && finalRef.current.endsWith(last)) {
          // Cumulative final (engine re-sends the whole utterance, longer each time) → replace,
          // don't append. This is what made the transcript pile up on some Android engines.
          finalRef.current = finalRef.current.slice(0, finalRef.current.length - last.length).trimEnd();
        }
        finalRef.current = (finalRef.current ? finalRef.current + " " : "") + chunk;
        lastFinalRef.current = chunk;
      }
      setText(finalRef.current);
      armSilence();
    };
    // While the user is actively speaking, don't let the silence timer fire; re-arm on pause.
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

  // Detect speech support and auto-start the mic on open (free mode only).
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!SR);
    if (SR && !guided) {
      // slight delay so it starts within the click gesture that opened the modal
      const id = setTimeout(startListening, 150);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up on unmount.
  useEffect(() => () => stopListening(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close the summary after a few seconds — but only when there's nothing left to act on
  // (no navigation offered) and the user hasn't started a follow-up.
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

    // A short agent loop so the model can log SEVERAL things (e.g. one entry for yesterday and
    // another for today) — it may split them across turns — and then confirm. Context is tiny
    // here, so a few rounds stay well within the provider's per-minute budget.
    const convo: AgentMsg[] = [{ role: "user", content }];
    const done: string[] = [];
    let navigated: string | null = null;
    let finalText = "";
    let hadError: string | null = null;

    for (let step = 0; step < 4; step++) {
      const res = await askCoachAgent(convo, ctx, lang);
      if (res.error) {
        hadError = res.error;
        break;
      }
      if (res.toolCalls && res.toolCalls.length) {
        convo.push({ role: "assistant", content: res.reply ?? "", tool_calls: res.toolCalls });
        for (const call of res.toolCalls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || "{}");
          } catch {
            args = {};
          }
          const result = runCoachTool(store, call.function.name, args, {
            navigate: (href) => {
              navigated = href;
            },
          });
          // Navigation is offered as a button on the summary, not counted as a logged action.
          if (call.function.name !== "navigate" && !/^(Error|No habit|No page|Unknown)/.test(result)) {
            done.push(result);
          }
          convo.push({ role: "tool", tool_call_id: call.id, content: result });
        }
        continue;
      }
      finalText = res.reply ?? "";
      break;
    }

    if (hadError) {
      setErr(hadError);
      setStage("input");
      return;
    }

    // Pure navigation (nothing was logged) → go straight there.
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
    <Modal open onClose={onClose} title={t("Quick capture")}>
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

          {/* Follow-up: keep going without reopening — log more, navigate, or change a setting. */}
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
