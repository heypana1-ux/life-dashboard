"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ImagePlus, Lightbulb, Mic, Plus, Save, Search, Shuffle, Sparkles, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { JournalEntry } from "@/lib/types";
import { addDays, fmtLong, fmtShort, todayISO, weekdayOf } from "@/lib/date";
import { resizeImageToBlob } from "@/lib/image";
import { deleteImage, putImage } from "@/lib/photoStore";
import { StoredImage } from "@/components/StoredImage";
import { promptForDate, JOURNAL_PROMPTS } from "@/lib/journalPrompts";
import { buildCoachContext } from "@/lib/coachContext";
import { coachAsk, checkCoachConfigured } from "@/lib/ai";
import { useT } from "@/lib/i18n";
import { Card, PageHeader, Button, EmptyState, HeaderAction } from "@/components/ui";

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
          <div className="relative flex items-center gap-[9px] rounded-[12px] border border-[var(--border)] px-3 py-2.5">
            <Search className="shrink-0 text-[var(--text-faint)]" size={15} />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[12.5px] outline-none placeholder:text-[var(--text-dim)]"
              placeholder={t("Search entries…")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {/* Rows are flush with the card; the open one gets the deep area wash from the design. */}
          <div className="mt-2.5 flex max-h-[60vh] flex-col gap-[3px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-[12.5px] text-[var(--text-muted)]">{t("No entries found.")}</p>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.id}
                  onClick={() => openEntry(e)}
                  className={`w-full rounded-[14px] px-3 py-2.5 text-left transition ${
                    e.id === activeId ? "area-deep" : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium">
                      {e.title || t("Untitled")}
                    </span>
                    {e.mood && (
                      <span className="num shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                        {e.mood}/10
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-[var(--text-dim)]">
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
            <Card className="overflow-hidden !p-0">
              <div className="border-b border-[var(--border)] px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <input
                    type="date"
                    className="bg-transparent text-[12px] text-[var(--text-faint)] outline-none"
                    value={active.date}
                    onChange={(e) => setDraft({ ...active, date: e.target.value })}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(-1)}
                      className="rounded-lg p-1 text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                      aria-label="Older"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => navigate(1)}
                      className="rounded-lg p-1 text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                      aria-label="Newer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <input
                  className="mt-1.5 w-full bg-transparent text-[21px] font-semibold tracking-[-0.02em] outline-none placeholder:text-[var(--text-dim)]"
                  placeholder="Title your day…"
                  value={active.title}
                  onChange={(e) => setDraft({ ...active, title: e.target.value })}
                />
              </div>
              <div className="px-4 py-3.5">
                <PromptBar
                  onUse={(p) => setDraft({ ...active, body: active.body ? `${active.body}\n\n${p}\n` : `${p}\n` })}
                />
                <textarea
                  className="min-h-[224px] w-full resize-none bg-transparent text-[14px] leading-7 outline-none placeholder:text-[var(--text-dim)]"
                  placeholder={t("Write freely…")}
                  value={active.body}
                  onChange={(e) => setDraft({ ...active, body: e.target.value })}
                  style={{
                    backgroundImage:
                      "linear-gradient(transparent 27px, var(--surface-2) 27px, transparent 28px)",
                    backgroundSize: "100% 28px",
                    lineHeight: "28px",
                  }}
                />
                <div className="mt-2.5 flex items-center gap-2">
                  <DictateButton onText={(txt) => setDraft({ ...active, body: (active.body ? active.body + " " : "") + txt })} />
                </div>

                {/* Photos sit above the fields as 78px tiles, exactly as in the design. */}
                {(active.photos?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {active.photos!.map((src, i) => (
                      <div key={src} className="relative">
                        <StoredImage src={src} className="h-[78px] w-[78px] rounded-[12px] border border-[var(--border)] object-cover" />
                        <button
                          onClick={() => {
                            void deleteImage(src);
                            setDraft({ ...active, photos: active.photos!.filter((_, j) => j !== i) });
                          }}
                          className="absolute -right-1.5 -top-1.5 rounded-full bg-[var(--bad)] p-0.5 text-white"
                          aria-label={t("Delete")}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Highlight | Mood, then Location | Weather — two columns on every width. */}
                <div className="mt-3.5 grid grid-cols-2 gap-[9px]">
                  <JField label={t("Highlight")}>
                    <input
                      className={jInput}
                      value={active.highlight ?? ""}
                      onChange={(e) => setDraft({ ...active, highlight: e.target.value })}
                    />
                  </JField>
                  <JField label={t("Mood (1–10)")}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className={jInput}
                      value={active.mood ?? ""}
                      onChange={(e) =>
                        setDraft({ ...active, mood: e.target.value ? Number(e.target.value) : undefined })
                      }
                    />
                  </JField>
                  <JField label={t("Location")}>
                    <input
                      className={jInput}
                      value={active.location ?? ""}
                      onChange={(e) => setDraft({ ...active, location: e.target.value })}
                    />
                  </JField>
                  <JField label={t("Weather")}>
                    <input
                      className={jInput}
                      placeholder="☀️ / 🌧️ / …"
                      value={active.weather ?? ""}
                      onChange={(e) => setDraft({ ...active, weather: e.target.value })}
                    />
                  </JField>
                </div>

                <div className="mt-[9px]">
                  <JField label={t("Tags (comma separated)")}>
                    <input
                      className={jInput}
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
                  </JField>
                </div>

                <label className="mt-[11px] inline-flex cursor-pointer items-center gap-[7px] rounded-[12px] border border-[var(--border)] px-3 py-[9px] text-[12.5px] font-medium hover:bg-[var(--surface-2)]">
                  <ImagePlus size={15} /> {t("Add photo")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      // The bytes go to IndexedDB; the entry keeps only a short reference.
                      try {
                        const ref = await putImage(await resizeImageToBlob(file));
                        setDraft({ ...active, photos: [...(active.photos ?? []), ref] });
                      } catch {
                        /* an unreadable file just doesn't get added */
                      }
                    }}
                  />
                </label>
              </div>
              {active.id && <ReflectCard entry={active} />}

              <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={save}
                    disabled={!active.title && !active.body}
                    className="area-grad inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-[12.5px] font-semibold disabled:opacity-40"
                  >
                    <Save size={15} /> {t("Save")}
                  </button>
                  {flash && <span className="text-[12.5px] text-[var(--good)]">{t("Saved ✓")}</span>}
                </div>
                {active.id && (
                  <button
                    onClick={del}
                    className="rounded-lg p-1.5 text-[var(--text-dim)] hover:text-[var(--bad)]"
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

/** Journal field: 10.5px uppercase label over a 12px-radius input, as in the design. */
const jInput =
  "w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[12.5px] outline-none transition placeholder:text-[var(--text-dim)] focus:border-[var(--area-a)]";

function JField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
        {label}
      </div>
      <div className="mt-[5px]">{children}</div>
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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Start at the right edge — the recent weeks are the interesting ones.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [cells]);

  if (count === 0) return null;

  return (
    <Card>
      <div className="mb-2.5 flex items-center gap-[7px] text-[13px] font-medium">
        <Sparkles size={15} className="area-text" /> {t("Mood over the year")}
      </div>
      {/* 11px cells on a horizontal scroller, exactly as the design lays it out. Opens
          scrolled to the right so the most recent weeks are what you see first. */}
      <div ref={scrollRef} className="hide-scrollbar no-swipe -mx-1 overflow-x-auto px-1">
        <div
          className="grid w-max grid-flow-col gap-[3px]"
          style={{ gridTemplateRows: "repeat(7, 11px)" }}
        >
          {cells.map((c) => (
            <span
              key={c.date}
              title={c.mood != null ? `${fmtShort(c.date)}: ${c.mood}/10` : ""}
              className="h-[11px] w-[11px] rounded-[3px]"
              style={{ background: c.future ? "transparent" : c.mood != null ? moodColor(c.mood) : "var(--surface-2)" }}
            />
          ))}
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[var(--text-dim)]">
        {t("Low")}
        {["var(--bad)", "var(--warn)", "var(--info)", "var(--good)"].map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />
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
    <div className="flex items-center gap-[9px] rounded-[12px] bg-[var(--surface-2)] px-[11px] py-2.5">
      <Lightbulb size={15} className="area-text shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--text-muted)]">{t(prompt)}</span>
      <button onClick={() => setIdx(Math.floor(Math.random() * JOURNAL_PROMPTS.length))} className="shrink-0 text-[var(--text-dim)] hover:text-[var(--text)]" aria-label={t("Shuffle")}>
        <Shuffle size={14} />
      </button>
      <button onClick={() => onUse(t(prompt))} className="shrink-0 rounded-[9px] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold hover:text-[var(--accent)]">
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
      className={`inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-[7px] text-[11.5px] font-medium transition ${
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
      <div className="area-soft mx-4 mb-3 flex items-center justify-between gap-3 rounded-[14px] border border-[color-mix(in_srgb,var(--area-a)_25%,transparent)] px-[13px] py-3">
        <span className="text-[11.5px] leading-[1.45] text-[var(--text-muted)]">{t("Let the AI coach reflect on your entries (needs journal access).")}</span>
        <Button size="sm" variant="soft" onClick={() => updateSettings({ aiCoachEnabled: true, aiJournalAccess: true })}>{t("Enable")}</Button>
      </div>
    );
  }

  return (
    <div className="area-soft mx-4 mb-3 rounded-[14px] border border-[color-mix(in_srgb,var(--area-a)_25%,transparent)] px-[13px] py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold"><Sparkles size={14} /> {t("Coach reflection")}</span>
        {(text || err) && <button onClick={reflect} disabled={loading} className="text-[11px] text-[var(--text-dim)] hover:text-[var(--text)]">{t("Regenerate")}</button>}
      </div>
      {loading ? (
        <div className="space-y-2 py-1"><div className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" /><div className="h-3 w-4/5 animate-pulse rounded bg-[var(--surface-2)]" /></div>
      ) : text ? (
        <p className="mt-[7px] whitespace-pre-wrap text-[12.5px] leading-[1.5] text-[var(--text-muted)]">{text}</p>
      ) : err ? (
        <div className="flex items-center justify-between gap-2"><span className="text-xs text-[var(--bad)]">{t("Couldn't reach the AI service. Check your connection and try again.")}</span><Button size="sm" variant="soft" onClick={reflect}>{t("Try again")}</Button></div>
      ) : (
        <div className="mt-[7px] flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-[var(--text-muted)]">{t("Save the entry, then get a short, kind reflection.")}</span>
          <Button size="sm" onClick={reflect}><Sparkles size={14} /> {t("Reflect")}</Button>
        </div>
      )}
    </div>
  );
}
