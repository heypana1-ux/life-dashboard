"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ImagePlus, Lightbulb, Mic, Plus, Save, Search, Shuffle, Sparkles, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { JournalEntry } from "@/lib/types";
import { addDays, fmtLong, fmtShort, todayISO, weekdayOf } from "@/lib/date";
import { resizeImageToDataUrl } from "@/lib/image";
import { promptForDate, JOURNAL_PROMPTS } from "@/lib/journalPrompts";
import { buildCoachContext } from "@/lib/coachContext";
import { coachAsk, checkCoachConfigured } from "@/lib/ai";
import { useT } from "@/lib/i18n";
import { Card, PageHeader, Button, Field, inputCls, EmptyState, Badge, HeaderAction } from "@/components/ui";

export default function JournalPage() {
  const { data, saveJournal, removeJournal } = useStore();
  const t = useT();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<JournalEntry | null>(null);
  const [flash, setFlash] = useState(false);

  const entries = useMemo(
    () => [...data.journal].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.journal],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q) ||
        (e.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [entries, query]);

  const activeIndex = entries.findIndex((e) => e.id === activeId);
  const active = draft ?? (activeIndex >= 0 ? entries[activeIndex] : null);

  function openEntry(e: JournalEntry) {
    setActiveId(e.id);
    setDraft({ ...e });
  }

  function newEntry() {
    const now = new Date().toISOString();
    const e: JournalEntry = {
      id: "",
      date: todayISO(),
      title: "",
      body: "",
      createdAt: now,
      updatedAt: now,
      tags: [],
    };
    setActiveId(null);
    setDraft(e);
  }

  function save() {
    if (!draft) return;
    const saved = saveJournal({ ...draft, updatedAt: new Date().toISOString() });
    setActiveId(saved.id);
    setDraft({ ...saved });
    setFlash(true);
    setTimeout(() => setFlash(false), 1500);
  }

  function del() {
    if (draft?.id) removeJournal(draft.id);
    setDraft(null);
    setActiveId(null);
  }

  function navigate(dir: -1 | 1) {
    if (entries.length === 0) return;
    // entries sorted newest-first; prev page (older) = +1 index
    let idx = activeIndex < 0 ? 0 : activeIndex + (dir === 1 ? -1 : 1);
    idx = Math.max(0, Math.min(entries.length - 1, idx));
    openEntry(entries[idx]);
  }

  return (
    <div className="space-y-[14px]">
      <PageHeader
        kicker={`${data.journal.length} ${t("entries")} · ${t("private")}`}
        lead={t("Your (n)")}
        title={t("Journal")}
        subtitle={t("Private by default. Stored only on this device.")}
        action={
          <HeaderAction primary label={t("New entry")} onClick={newEntry}>
            <Plus size={17} />
          </HeaderAction>
        }
      />

      <MoodHeatmap />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Entry list */}
        <Card className="lg:col-span-1">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" size={16} />
            <input
              className={inputCls + " pl-9"}
              placeholder={t("Search entries…")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">{t("No entries found.")}</p>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.id}
                  onClick={() => openEntry(e)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                    e.id === activeId
                      ? "bg-[var(--accent-soft)]"
                      : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">
                      {e.title || t("Untitled")}
                    </span>
                    {e.mood && <Badge>{e.mood}/10</Badge>}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[var(--text-faint)]">
                    {fmtLong(e.date)}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Book page */}
        <div className="lg:col-span-2">
          {!active ? (
            <EmptyState
              icon={<BookOpen size={28} />}
              title={t("Open or start an entry")}
              hint={t("Your journal reads like a book — one page per day. Pick an entry on the left or start a new one.")}
              action={
                <Button onClick={newEntry}>
                  <Plus size={16} /> {t("New entry")}
                </Button>
              }
            />
          ) : (
            <Card className="!p-0">
              <div className="border-b border-[var(--border)] px-6 py-4">
                <div className="flex items-center justify-between">
                  <input
                    type="date"
                    className="bg-transparent text-sm text-[var(--text-muted)] outline-none"
                    value={active.date}
                    onChange={(e) => setDraft({ ...active, date: e.target.value })}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(-1)}
                      className="rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-2)]"
                      aria-label="Older"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => navigate(1)}
                      className="rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-2)]"
                      aria-label="Newer"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <input
                  className="mt-2 w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-[var(--text-faint)]"
                  placeholder="Title your day…"
                  value={active.title}
                  onChange={(e) => setDraft({ ...active, title: e.target.value })}
                />
              </div>
              <div className="px-6 py-5">
                <PromptBar
                  onUse={(p) => setDraft({ ...active, body: active.body ? `${active.body}\n\n${p}\n` : `${p}\n` })}
                />
                <textarea
                  className="min-h-[45vh] w-full resize-none bg-transparent text-[15px] leading-7 outline-none placeholder:text-[var(--text-faint)]"
                  placeholder={t("Write freely…")}
                  value={active.body}
                  onChange={(e) => setDraft({ ...active, body: e.target.value })}
                  style={{
                    backgroundImage:
                      "linear-gradient(transparent 27px, var(--border) 27px, transparent 28px)",
                    backgroundSize: "100% 28px",
                    lineHeight: "28px",
                  }}
                />
                <div className="mt-2 flex items-center gap-2">
                  <DictateButton onText={(txt) => setDraft({ ...active, body: (active.body ? active.body + " " : "") + txt })} />
                </div>
                {/* Photos */}
                {(active.photos?.length ?? 0) > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {active.photos!.map((src, i) => (
                      <div key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-24 w-24 rounded-lg object-cover" />
                        <button
                          onClick={() =>
                            setDraft({ ...active, photos: active.photos!.filter((_, j) => j !== i) })
                          }
                          className="absolute -right-1.5 -top-1.5 rounded-full bg-[var(--bad)] p-0.5 text-white"
                          aria-label={t("Delete")}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label={t("Highlight of the day")}>
                    <input
                      className={inputCls}
                      value={active.highlight ?? ""}
                      onChange={(e) => setDraft({ ...active, highlight: e.target.value })}
                    />
                  </Field>
                  <Field label={t("Mood (1–10)")}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className={inputCls}
                      value={active.mood ?? ""}
                      onChange={(e) =>
                        setDraft({ ...active, mood: e.target.value ? Number(e.target.value) : undefined })
                      }
                    />
                  </Field>
                  <Field label={t("Location")}>
                    <input
                      className={inputCls}
                      value={active.location ?? ""}
                      onChange={(e) => setDraft({ ...active, location: e.target.value })}
                    />
                  </Field>
                  <Field label={t("Weather")}>
                    <input
                      className={inputCls}
                      placeholder="☀️ / 🌧️ / …"
                      value={active.weather ?? ""}
                      onChange={(e) => setDraft({ ...active, weather: e.target.value })}
                    />
                  </Field>
                </div>

                <Field label={t("Tags (comma separated)")}>
                  <input
                    className={inputCls}
                    value={(active.tags ?? []).join(", ")}
                    onChange={(e) =>
                      setDraft({
                        ...active,
                        tags: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>

                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-2)]">
                  <ImagePlus size={16} /> {t("Add photo")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await resizeImageToDataUrl(file);
                        setDraft({ ...active, photos: [...(active.photos ?? []), url] });
                      } catch {
                        /* ignore */
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {active.id && <ReflectCard entry={active} />}

              <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3">
                <div className="flex items-center gap-3">
                  <Button onClick={save} disabled={!active.title && !active.body}>
                    <Save size={16} /> {t("Save")}
                  </Button>
                  {flash && <span className="text-sm text-[var(--good)]">{t("Saved ✓")}</span>}
                </div>
                {active.id && (
                  <button
                    onClick={del}
                    className="rounded-lg p-2 text-[var(--text-faint)] hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
                    aria-label="Delete entry"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Mood heatmap (last year) ---------------- */

function moodColor(m: number): string {
  if (m <= 3) return "var(--bad)";
  if (m <= 5) return "var(--warn)";
  if (m <= 7) return "var(--info)";
  return "var(--good)";
}

function MoodHeatmap() {
  const { data } = useStore();
  const t = useT();

  const { cells, count } = useMemo(() => {
    // Mood per day: journal mood wins, else the daily check-in mood.
    const byDate = new Map<string, number>();
    for (const r of data.reviews) if (typeof r.mood === "number") byDate.set(r.date, r.mood);
    for (const j of data.journal) if (typeof j.mood === "number") byDate.set(j.date, j.mood);

    const today = todayISO();
    const weeks = 53;
    const lead = weekdayOf(today);
    const total = weeks * 7;
    const start = addDays(today, -(total - 1 - (6 - lead)));
    const out: { date: string; mood: number | null; future: boolean }[] = [];
    for (let i = 0; i < total; i++) {
      const date = addDays(start, i);
      out.push({ date, mood: byDate.get(date) ?? null, future: date > today });
    }
    return { cells: out, count: byDate.size };
  }, [data.journal, data.reviews]);

  if (count === 0) return null;

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Sparkles size={15} className="text-[var(--accent)]" /> {t("Mood over the year")}
      </div>
      {/* The whole year fits the card, as in the design — no horizontal scroll, so the
          most recent (coloured) weeks are always visible. */}
      <div className="grid grid-flow-col grid-rows-7 gap-[2px]" style={{ gridAutoColumns: "minmax(0, 1fr)" }}>
        {cells.map((c) => (
          <span
            key={c.date}
            title={c.mood != null ? `${fmtShort(c.date)}: ${c.mood}/10` : ""}
            className="aspect-square w-full rounded-[2px]"
            style={{ background: c.future ? "transparent" : c.mood != null ? moodColor(c.mood) : "var(--surface-3)" }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--text-faint)]">
        {t("Low")}
        {["var(--bad)", "var(--warn)", "var(--info)", "var(--good)"].map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />
        ))}
        {t("High")}
      </div>
    </Card>
  );
}

/* ---------------- Prompt of the day ---------------- */

function PromptBar({ onUse }: { onUse: (prompt: string) => void }) {
  const t = useT();
  const [idx, setIdx] = useState<number | null>(null);
  const prompt = idx == null ? promptForDate(todayISO()) : JOURNAL_PROMPTS[idx];
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2">
      <Lightbulb size={15} className="shrink-0 text-[var(--accent)]" />
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-muted)]">{t(prompt)}</span>
      <button onClick={() => setIdx(Math.floor(Math.random() * JOURNAL_PROMPTS.length))} className="shrink-0 text-[var(--text-faint)] hover:text-[var(--text)]" aria-label={t("Shuffle")}>
        <Shuffle size={14} />
      </button>
      <button onClick={() => onUse(t(prompt))} className="shrink-0 rounded-lg bg-[var(--surface)] px-2 py-1 text-xs font-medium hover:text-[var(--accent)]">
        {t("Use")}
      </button>
    </div>
  );
}

/* ---------------- Dictation ---------------- */

function DictateButton({ onText }: { onText: (text: string) => void }) {
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

  if (!supported) return null;
  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
        listening ? "border-[var(--bad)] bg-[var(--bad)]/10 text-[var(--bad)]" : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
      }`}
    >
      <Mic size={14} /> {listening ? t("Listening… tap to stop") : t("Dictate")}
    </button>
  );
}

/* ---------------- AI reflection ---------------- */

function ReflectCard({ entry }: { entry: JournalEntry }) {
  const { data, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();
  const enabled = !!data.settings.aiCoachEnabled && !!data.settings.aiJournalAccess;
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  async function reflect() {
    setErr(false);
    setLoading(true);
    const ok = await checkCoachConfigured();
    if (!ok) { setLoading(false); setErr(true); return; }
    const ctx = buildCoachContext(data, d.history).text;
    const prompt = `Reflect warmly on my journal entry from ${entry.date}${entry.mood ? ` (mood ${entry.mood}/10)` : ""}. In 2-3 sentences: acknowledge what I wrote, gently point out one pattern or reframe, and one small encouraging suggestion. Entry: "${(entry.title ? entry.title + ". " : "") + (entry.body ?? "")}".`;
    const res = await coachAsk(prompt, ctx, data.settings.language);
    setLoading(false);
    if (res.reply) setText(res.reply);
    else setErr(true);
  }

  if (!enabled) {
    return (
      <div className="mx-6 mb-3 flex items-center justify-between gap-3 rounded-xl bg-[var(--accent-soft)]/40 px-3 py-2.5">
        <span className="text-xs text-[var(--text-muted)]">{t("Let the AI coach reflect on your entries (needs journal access).")}</span>
        <Button size="sm" variant="soft" onClick={() => updateSettings({ aiCoachEnabled: true, aiJournalAccess: true })}>{t("Enable")}</Button>
      </div>
    );
  }

  return (
    <div className="mx-6 mb-3 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/40 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles size={14} className="text-[var(--accent)]" /> {t("Coach reflection")}</span>
        {(text || err) && <button onClick={reflect} disabled={loading} className="text-xs text-[var(--text-faint)] hover:text-[var(--text)]">{t("Regenerate")}</button>}
      </div>
      {loading ? (
        <div className="space-y-2 py-1"><div className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" /><div className="h-3 w-4/5 animate-pulse rounded bg-[var(--surface-2)]" /></div>
      ) : text ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{text}</p>
      ) : err ? (
        <div className="flex items-center justify-between gap-2"><span className="text-xs text-[var(--bad)]">{t("Couldn't reach the AI service. Check your connection and try again.")}</span><Button size="sm" variant="soft" onClick={reflect}>{t("Try again")}</Button></div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[var(--text-muted)]">{t("Save the entry, then get a short, kind reflection.")}</span>
          <Button size="sm" onClick={reflect}><Sparkles size={14} /> {t("Reflect")}</Button>
        </div>
      )}
    </div>
  );
}
