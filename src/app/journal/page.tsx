"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Plus, Save, Search, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { JournalEntry } from "@/lib/types";
import { fmtLong, todayISO } from "@/lib/date";
import { useT } from "@/lib/i18n";
import { Card, PageHeader, Button, Field, inputCls, EmptyState, Badge } from "@/components/ui";

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
    <div className="space-y-6">
      <PageHeader
        title={t("Journal")}
        subtitle={t("Private by default. Stored only on this device.")}
        action={
          <Button onClick={newEntry}>
            <Plus size={16} /> {t("New entry")}
          </Button>
        }
      />

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
                </div>
              </div>
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
