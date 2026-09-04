"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bot, MessageCircle, Send, Shield, Sparkles, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { buildCoachContext } from "@/lib/coachContext";
import { askCoach, coachAsk, checkCoachConfigured, CoachTurn, askCoachAgent, AgentMsg } from "@/lib/ai";
import { runCoachTool } from "@/lib/coachTools";
import { uid } from "@/lib/defaults";
import { todayISO } from "@/lib/date";
import { weekAnchor } from "@/lib/recap";
import { Button } from "@/components/ui";

const BRIEFING_PROMPT =
  "Write a short daily briefing of 2-3 sentences: how I'm doing based on my recent data, and one concrete thing to focus on today. Be warm, specific and encouraging. Do not start with a greeting.";

const WEEKLY_CHECKIN_PROMPT =
  "Write a short, warm weekly check-in of 2-3 sentences. Follow up on what I've been working on — reference my last weekly focus or your previous coaching note if it's relevant — and end with exactly one specific question inviting me to reflect on the past week. Do not start with a greeting.";

const QUICK_PROMPTS = [
  "How is my week going?",
  "Why was my score lower recently?",
  "What should I prioritise tomorrow?",
  "Which habits help me the most?",
  "What negative patterns do you see?",
];

const ERROR_MSG: Record<string, string> = {
  not_configured: "The AI coach isn't set up yet. Add your Groq API key (see setup below).",
  rate_limited: "You've sent several AI requests in a short time. The free AI has a per-minute limit — wait about a minute and try again.",
  provider_error: "The AI provider returned an error. Try again shortly.",
  network: "Couldn't reach the AI service. Check your connection and try again.",
  empty: "The AI didn't return an answer — try rephrasing.",
  bad_request: "Something went wrong with that request.",
};

/* Only send the (token-heavy) tool schemas when the message actually asks the coach to DO
   something — logging, creating, navigating, changing a setting. Pure questions use the cheaper
   tool-free chat path, which roughly halves the tokens per request and keeps you under the free
   provider's per-minute limit. */
const ACTION_RE =
  /\b(log|logg|track|record|add|create|set|change|adjust|open|navigat|go to|show me|mark|done|hide|show|reset|vacation|trag|eintrag|einträgt|eintragen|notier|erstell|hinzuf|markier|navigier|öffne|geh zu|zeig|ausblend|einblend|urlaub|einstellung|ändere|setz|dashboard)/i;

export function CoachChat({
  onClose,
  hideHeader,
  chatId,
  onThreadCreated,
}: {
  onClose?: () => void;
  hideHeader?: boolean;
  chatId?: string | null;
  onThreadCreated?: (id: string) => void;
}) {
  const store = useStore();
  const { data, updateSettings, saveCoachChat } = store;
  const d = useDerived();
  const t = useT();
  const enabled = !!data.settings.aiCoachEnabled;

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<CoachTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<string | null>(chatId ?? null);

  // Load the selected thread's messages whenever the chosen thread changes. Skip when the id
  // matches the thread we're already showing (e.g. the one we just created mid-send), so an
  // in-progress conversation isn't wiped before the store has caught up.
  useEffect(() => {
    if (chatId && chatId === threadRef.current) return;
    threadRef.current = chatId ?? null;
    const thread = chatId ? data.coachChats.find((c) => c.id === chatId) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(thread ? thread.messages.map((m) => ({ role: m.role, content: m.content })) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    checkCoachConfigured().then((c) => alive && setConfigured(c));
    return () => {
      alive = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  /** Persist the current messages to a saved thread (creating one lazily). */
  function persist(msgs: CoachTurn[]) {
    if (msgs.length === 0) return;
    let id = threadRef.current;
    const now = new Date().toISOString();
    if (!id) {
      id = uid("chat");
      threadRef.current = id;
      onThreadCreated?.(id);
    }
    const existing = data.coachChats.find((c) => c.id === id);
    const firstUser = msgs.find((m) => m.role === "user")?.content ?? "Chat";
    saveCoachChat({
      id,
      title: existing?.title ?? firstUser.slice(0, 40),
      messages: msgs.map((m) => ({ role: m.role, content: m.content })),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setErr(null);
    const display: CoachTurn[] = [...messages, { role: "user", content }];
    setMessages(display);
    setInput("");
    setLoading(true);
    persist(display);

    const ctx = buildCoachContext(data, d.history).text;
    const lang = data.settings.language;
    const actions: string[] = [];
    let finalText = "";
    let hadError: string | null = null;

    if (!ACTION_RE.test(content)) {
      // Pure question → cheaper, tool-free chat path (no tool schemas sent). Recent turns are
      // trimmed server-side, so history stays cheap while keeping follow-ups coherent.
      const res = await askCoach(display, ctx, lang);
      if (res.error) hadError = res.error;
      else finalText = res.reply ?? "";
    } else {
      // Action → agent loop: the coach may call tools; we run them and feed results back.
      const convo: AgentMsg[] = display.map((m) => ({ role: m.role, content: m.content }));
      for (let step = 0; step < 5; step++) {
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
            const result = runCoachTool(store, call.function.name, args);
            actions.push(result);
            convo.push({ role: "tool", tool_call_id: call.id, content: result });
          }
          continue;
        }
        finalText = res.reply ?? "";
        break;
      }
    }
    setLoading(false);

    if (hadError) {
      setErr(hadError);
      if (hadError === "not_configured") setConfigured(false);
      return;
    }
    let body = finalText;
    const ok = actions.filter((a) => !/^(Error|No habit|Unknown)/.test(a));
    if (!body && ok.length) body = t("Done.");
    if (ok.length) body += "\n\n" + ok.map((a) => "✓ " + a).join("\n");
    if (!body) body = t("The AI didn't return an answer — try rephrasing.");
    const finalMsgs: CoachTurn[] = [...display, { role: "assistant", content: body }];
    setMessages(finalMsgs);
    persist(finalMsgs);
  }

  /* ---- Opt-in gate ---- */
  if (!enabled) {
    return (
      <Shell onClose={onClose} hideHeader={hideHeader} t={t}>
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
          <div className="grad mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white">
            <Sparkles size={24} />
          </div>
          <h3 className="text-lg font-semibold">{t("Your AI coach")}</h3>
          <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
            {t("Ask about your week, your patterns and what to focus on. Your app analyses the numbers first — the coach only interprets the results.")}
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-[var(--surface-2)] p-3 text-left">
            <Shield size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              {t("Only derived summaries are sent (scores, trends, habit names, the engine's findings) — never your journal text, health notes or finance amounts. You can turn this off any time in Settings.")}
            </p>
          </div>
          <Button className="mt-5" onClick={() => updateSettings({ aiCoachEnabled: true })}>
            <Sparkles size={16} /> {t("Enable AI coach")}
          </Button>
        </div>
      </Shell>
    );
  }

  /* ---- Setup needed (enabled but no key on server) ---- */
  if (configured === false) {
    return (
      <Shell onClose={onClose} hideHeader={hideHeader} t={t}>
        <div className="flex-1 overflow-y-auto px-1">
          <div className="rounded-xl border border-[var(--border)] p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Bot size={16} className="text-[var(--accent)]" /> {t("One-time setup")}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t("The coach needs a free Groq API key, stored securely on the server (never in the app).")}
            </p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-[var(--text-muted)]">
              <li>{t("Create a free key at console.groq.com → API Keys.")}</li>
              <li>{t("In Vercel → your project → Settings → Environment Variables, add GROQ_API_KEY with that value.")}</li>
              <li>{t("Redeploy the project, then tap Re-check below.")}</li>
            </ol>
            <Button variant="soft" className="mt-4" onClick={() => { setConfigured(null); checkCoachConfigured().then(setConfigured); }}>
              {t("Re-check")}
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---- Chat ---- */
  return (
    <Shell onClose={onClose} hideHeader={hideHeader} t={t}>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-0.5 py-1">
        {messages.length === 0 && (
          <div className="pt-2">
            <p className="mb-2 text-center text-sm text-[var(--text-muted)]">{t("Ask me anything about your data.")}</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(t(q))}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-[11px] py-1.5 text-[11.5px] font-medium text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)]"
                >
                  {t(q)}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "area-grad max-w-[78%] whitespace-pre-wrap rounded-[16px] rounded-br-[5px] px-[13px] py-[11px] text-[13px] leading-[1.5]"
                  : "max-w-[88%] whitespace-pre-wrap rounded-[16px] rounded-bl-[5px] bg-[var(--surface-2)] px-3.5 py-3 text-[13px] leading-[1.55]"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-[5px] rounded-[16px] rounded-bl-[5px] bg-[var(--surface-2)] px-3.5 py-3">
              <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-[var(--text-dim)] [animation-delay:-0.3s]" />
              <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-[var(--text-dim)] [animation-delay:-0.15s]" />
              <span className="h-[7px] w-[7px] animate-bounce rounded-full bg-[var(--text-dim)]" />
            </div>
          </div>
        )}
        {err && (
          <p className="rounded-xl bg-[var(--bad)]/10 px-3 py-2 text-xs text-[var(--bad)]">{t(ERROR_MSG[err] ?? ERROR_MSG.network)}</p>
        )}
      </div>

      {/* One bordered composer holding the field and a 32px gradient send button. */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="mt-3 flex items-end gap-[9px] rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
      >
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={t("Ask about your data…")}
          className="max-h-28 min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-[12.5px] outline-none placeholder:text-[var(--text-dim)]"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="area-grad flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] disabled:opacity-40"
          aria-label={t("Send")}
        >
          <Send size={15} />
        </button>
      </form>
      <p className="mt-2 text-center text-[10px] text-[var(--text-dim)]">{t("AI can be wrong. Interprets your data, not medical or financial advice.")}</p>
    </Shell>
  );
}

/** Frame used by both the panel and the page (the page passes no onClose). */
function Shell({ children, onClose, hideHeader, t }: { children: React.ReactNode; onClose?: () => void; hideHeader?: boolean; t: (k: string) => string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!hideHeader && (
        <div className="mb-2 flex items-center justify-between border-b border-[var(--border)] pb-2">
          <div className="flex items-center gap-2">
            <span className="grad flex h-7 w-7 items-center justify-center rounded-lg text-white">
              <Sparkles size={15} />
            </span>
            <span className="text-sm font-semibold">{t("Coach")}</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text)]" aria-label={t("Close")}>
              <X size={18} />
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/* ---------------- Proactive daily briefing ---------------- */

export function CoachBriefing() {
  const { data, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();
  const enabled = !!data.settings.aiCoachEnabled;
  const today = todayISO();
  const cached = data.settings.coachBriefing;
  const [text, setText] = useState(cached?.date === today ? cached.text : "");
  const [loading, setLoading] = useState(false);
  const startedRef = useRef(false);

  async function generate() {
    setLoading(true);
    const ok = await checkCoachConfigured();
    if (!ok) {
      setLoading(false);
      return;
    }
    const ctx = buildCoachContext(data, d.history).text;
    const res = await coachAsk(BRIEFING_PROMPT, ctx, data.settings.language);
    setLoading(false);
    if (res.reply) {
      setText(res.reply);
      const hist = (data.settings.coachHistory ?? []).filter((h) => h.date !== today);
      updateSettings({
        coachBriefing: { date: today, text: res.reply },
        coachHistory: [...hist, { date: today, text: res.reply }].slice(-6),
      });
    }
  }

  useEffect(() => {
    if (!enabled || text || startedRef.current) return;
    startedRef.current = true;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled || (!text && !loading)) return null;

  return (
    /* The coach's own voice gets its own surface: a soft wash of the page accent with a
       hairline in the same hue, so a briefing reads as "from the coach", not as another card. */
    <div className="area-deep rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--area-a)_25%,transparent)] p-[18px]">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="area-grad flex h-7 w-7 items-center justify-center rounded-lg">
            <Sparkles size={15} />
          </span>
          <span className="text-sm font-semibold">{t("Coach briefing")}</span>
        </div>
        {text && (
          <button
            onClick={() => { startedRef.current = true; setText(""); void generate(); }}
            disabled={loading}
            className="text-xs text-[var(--text-faint)] hover:text-[var(--text)] disabled:opacity-40"
          >
            {t("Refresh")}
          </button>
        )}
      </div>
      {loading && !text ? (
        <div className="space-y-2 py-1">
          <div className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">{text}</p>
      )}
    </div>
  );
}

/* ---------------- Proactive weekly check-in ---------------- */

export function CoachWeeklyCheckin() {
  const { data, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();
  const enabled = !!data.settings.aiCoachEnabled;
  const week = weekAnchor(todayISO());
  const cached = data.settings.coachCheckin;
  const [text, setText] = useState(cached?.week === week ? cached.text : "");
  const [loading, setLoading] = useState(false);
  const startedRef = useRef(false);

  async function generate() {
    setLoading(true);
    const ok = await checkCoachConfigured();
    if (!ok) {
      setLoading(false);
      return;
    }
    const ctx = buildCoachContext(data, d.history).text;
    const res = await coachAsk(WEEKLY_CHECKIN_PROMPT, ctx, data.settings.language);
    setLoading(false);
    if (res.reply) {
      setText(res.reply);
      updateSettings({ coachCheckin: { week, text: res.reply } });
    }
  }

  useEffect(() => {
    if (!enabled || text || startedRef.current) return;
    if (cached?.week === week) return; // already generated this week
    startedRef.current = true;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled || (!text && !loading)) return null;

  return (
    <div className="area-deep rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--area-a)_25%,transparent)] p-[18px]">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="area-grad flex h-7 w-7 items-center justify-center rounded-lg">
          <MessageCircle size={15} />
        </span>
        <span className="text-sm font-semibold">{t("Weekly check-in")}</span>
      </div>
      {loading && !text ? (
        <div className="space-y-2 py-1">
          <div className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">{text}</p>
          <Link href="/coach">
            <Button variant="soft" size="sm" className="mt-3">
              <Sparkles size={14} /> {t("Reply to your coach")}
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

/* ---------------- Reusable inline AI insight (Reports, Analysis, …) ---------------- */

export function CoachInsightCard({
  title,
  prompt,
  deep,
}: {
  title: string;
  prompt: string;
  /** Deep area-washed panel with a hairline glow (the calendar's "what your week says"). */
  deep?: boolean;
}) {
  const { data, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();
  const enabled = !!data.settings.aiCoachEnabled;
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setErr(null);
    setLoading(true);
    const ok = await checkCoachConfigured();
    if (!ok) {
      setLoading(false);
      setErr("not_configured");
      return;
    }
    const ctx = buildCoachContext(data, d.history).text;
    const res = await coachAsk(prompt, ctx, data.settings.language);
    setLoading(false);
    if (res.reply) setText(res.reply);
    else setErr(res.error ?? "network");
  }

  return (
    /* Pulse: a normal card whose section head carries a "Coach" badge, with the
       action as a full-width soft button underneath. The `deep` variant is the
       design's glowing panel — a saturated area wash behind an area hairline. */
    <div
      className={
        deep
          ? "area-deep rounded-[16px] border border-[color-mix(in_srgb,var(--area-a)_22%,transparent)] px-3.5 py-[13px]"
          : "card p-[18px]"
      }
    >
      <div className={deep ? "mb-1.5 flex items-center justify-between gap-2" : "mb-3 flex items-center justify-between gap-2"}>
        <h2 className={deep ? "slabel !text-[var(--area-text)]" : "slabel"}>{title}</h2>
        {enabled && (text || err) ? (
          <button
            onClick={generate}
            disabled={loading}
            className="text-[11px] text-[var(--text-faint)] hover:text-[var(--text)] disabled:opacity-40"
          >
            {t("Regenerate")}
          </button>
        ) : (
          <span className="area-soft inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold">
            {t("Coach")}
          </span>
        )}
      </div>

      {!enabled ? (
        <>
          <p className="text-[12.5px] leading-[1.5] text-[var(--text-muted)]">
            {t("Turn on the AI coach for a personal take on this.")}
          </p>
          <CoachAction onClick={() => updateSettings({ aiCoachEnabled: true })}>{t("Enable")}</CoachAction>
        </>
      ) : loading ? (
        <div className="space-y-2 py-1">
          <div className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
      ) : text ? (
        <p className="whitespace-pre-wrap text-[12.5px] leading-[1.5] text-[var(--text-muted)]">{text}</p>
      ) : err ? (
        <>
          <p className="text-[12.5px] leading-[1.5] text-[var(--bad)]">{t(ERROR_MSG[err] ?? ERROR_MSG.network)}</p>
          <CoachAction onClick={generate}>{t("Try again")}</CoachAction>
        </>
      ) : (
        <>
          <p className="text-[12.5px] leading-[1.5] text-[var(--text-muted)]">
            {t("Get a personalised read on this from your coach.")}
          </p>
          <CoachAction onClick={generate}>
            <Sparkles size={14} /> {t("Ask a follow-up")}
          </CoachAction>
        </>
      )}
    </div>
  );
}

/** Full-width soft action under a coach card, as in the design. */
function CoachAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="area-soft mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] py-[11px] text-[12.5px] font-semibold"
    >
      {children}
    </button>
  );
}

/* ---------------- Floating launcher + slide-over panel ---------------- */

export function CoachLauncher({ hidden = false }: { hidden?: boolean }) {
  const { data, ready } = useStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!ready || !data.settings.onboardingComplete) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`area-grad fixed bottom-[144px] right-4 z-[54] flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 md:bottom-6 ${
            hidden ? "pointer-events-none translate-y-2 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
          }`}
          aria-hidden={hidden}
          style={{
            height: 52,
            width: 52,
            /* .area-grad paints with --area-ink, which is near-black inside a dark page area;
               the sparkles need to stay white on the accent gradient. */
            color: "#fff",
            /* A halo in the page's own accent, plus a light rim so the button lifts off
               the background instead of sitting flat on it. */
            boxShadow:
              "0 0 0 1px color-mix(in srgb, var(--area-b) 45%, transparent)," +
              " 0 6px 18px color-mix(in srgb, var(--area-a) 45%, transparent)," +
              " 0 0 34px color-mix(in srgb, var(--area-a) 32%, transparent)",
          }}
          aria-label={t("Open coach")}
        >
          <Sparkles size={22} />
        </button>
      )}

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[65] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-stretch sm:justify-end"
          onClick={() => setOpen(false)}
        >
          {/* Mobile: a bottom sheet that stops short of the top so the blurred screen stays
              visible behind it. Desktop (sm+): the right-hand slide-over as before. */}
          <div
            className="sheet-up card m-0 flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-b-none rounded-t-2xl p-4 sm:m-3 sm:h-auto sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CoachChat onClose={() => setOpen(false)} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
