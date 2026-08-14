"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bot, Send, Shield, Sparkles, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { buildCoachContext } from "@/lib/coachContext";
import { askCoach, checkCoachConfigured, CoachTurn } from "@/lib/ai";
import { Button } from "@/components/ui";

const QUICK_PROMPTS = [
  "How is my week going?",
  "Why was my score lower recently?",
  "What should I prioritise tomorrow?",
  "Which habits help me the most?",
  "What negative patterns do you see?",
];

const ERROR_MSG: Record<string, string> = {
  not_configured: "The AI coach isn't set up yet. Add your Groq API key (see setup below).",
  rate_limited: "The free AI limit was hit for now — try again in a minute.",
  provider_error: "The AI provider returned an error. Try again shortly.",
  network: "Couldn't reach the AI service. Check your connection and try again.",
  empty: "The AI didn't return an answer — try rephrasing.",
  bad_request: "Something went wrong with that request.",
};

export function CoachChat({ onClose }: { onClose?: () => void }) {
  const { data, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();
  const enabled = !!data.settings.aiCoachEnabled;

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<CoachTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setErr(null);
    const next: CoachTurn[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const ctx = buildCoachContext(data, d.history).text;
    const res = await askCoach(next, ctx, data.settings.language);
    setLoading(false);
    if (res.reply) {
      setMessages((m) => [...m, { role: "assistant", content: res.reply as string }]);
    } else {
      setErr(res.error ?? "network");
      if (res.error === "not_configured") setConfigured(false);
    }
  }

  /* ---- Opt-in gate ---- */
  if (!enabled) {
    return (
      <Shell onClose={onClose} t={t}>
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
      <Shell onClose={onClose} t={t}>
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
    <Shell onClose={onClose} t={t}>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-0.5 py-1">
        {messages.length === 0 && (
          <div className="pt-2">
            <p className="mb-2 text-center text-sm text-[var(--text-muted)]">{t("Ask me anything about your data.")}</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(t(q))}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)]"
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
                  ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--accent)] px-3.5 py-2 text-sm text-white"
                  : "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-3.5 py-2 text-sm"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-faint)] [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-faint)] [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-faint)]" />
            </div>
          </div>
        )}
        {err && (
          <p className="rounded-xl bg-[var(--bad)]/10 px-3 py-2 text-xs text-[var(--bad)]">{t(ERROR_MSG[err] ?? ERROR_MSG.network)}</p>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="mt-2 flex items-end gap-2 border-t border-[var(--border)] pt-2"
      >
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={t("Ask your coach…")}
          className="max-h-28 flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white disabled:opacity-40"
          aria-label={t("Send")}
        >
          <Send size={17} />
        </button>
      </form>
      <p className="mt-1.5 text-center text-[10px] text-[var(--text-faint)]">{t("AI can be wrong. Interprets your data, not medical or financial advice.")}</p>
    </Shell>
  );
}

/** Frame used by both the panel and the page (the page passes no onClose). */
function Shell({ children, onClose, t }: { children: React.ReactNode; onClose?: () => void; t: (k: string) => string }) {
  return (
    <div className="flex h-full flex-col">
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
      {children}
    </div>
  );
}

/* ---------------- Floating launcher + slide-over panel ---------------- */

export function CoachLauncher() {
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
          className="grad fixed bottom-[84px] right-4 z-[54] flex h-13 w-13 items-center justify-center rounded-full text-white shadow-[var(--shadow)] md:bottom-6"
          style={{ height: 52, width: 52 }}
          aria-label={t("Open coach")}
        >
          <Sparkles size={22} />
        </button>
      )}

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[65] flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="card m-0 flex h-full w-full max-w-md flex-col rounded-none sm:m-3 sm:h-auto sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-2xl"
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
