"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Plus, Scale, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { NAV } from "@/lib/nav";
import { habitsForToday } from "@/lib/habitView";
import { todayISO } from "@/lib/date";

/** Fire this to open the palette from anywhere (buttons, other components). */
export const OPEN_EVENT = "open-command-palette";
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Cmd =
  | { key: string; kind: "habit"; label: string; done: boolean; run: () => void }
  | { key: string; kind: "action"; label: string; run: () => void }
  | { key: string; kind: "weight"; label: string }
  | { key: string; kind: "nav"; label: string; href: string; icon: React.ComponentType<{ size?: number }> };

export function CommandPalette() {
  const { data, ready, toggleHabit, setHabitLog, saveWeight } = useStore();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [weightMode, setWeightMode] = useState(false);
  const [kg, setKg] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Global open triggers: custom event + Cmd/Ctrl+K.
  useEffect(() => {
    const openIt = () => {
      setQuery("");
      setActive(0);
      setWeightMode(false);
      setKg("");
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) { setQuery(""); setActive(0); setWeightMode(false); setKg(""); }
          return !o;
        });
      }
    };
    window.addEventListener(OPEN_EVENT, openIt);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, openIt);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Focus the input once the overlay is open (DOM effect only, no state writes).
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, weightMode]);

  const date = todayISO();

  const commands = useMemo<Cmd[]>(() => {
    if (!ready) return [];
    const list: Cmd[] = [];

    // Today's build habits — quick tick.
    for (const g of habitsForToday(data, date).filter((x) => x.habit.kind === "build")) {
      const isCount = !!g.habit.timesPerDay;
      const done = isCount ? (g.log?.count ?? 0) > 0 : !!g.log?.done;
      list.push({
        key: "h-" + g.habit.id,
        kind: "habit",
        label: g.habit.name,
        done,
        run: () => {
          if (isCount) {
            const c = (g.log?.count ?? 0) + 1;
            setHabitLog({ ...g.log, habitId: g.habit.id, date, count: c, done: c > 0 });
          } else {
            toggleHabit(g.habit.id, date);
          }
        },
      });
    }

    // Quick-entry actions.
    list.push({ key: "weight", kind: "weight", label: t("Log weight") });
    list.push({ key: "a-journal", kind: "action", label: t("New journal entry"), run: () => router.push("/journal") });
    list.push({ key: "a-tx", kind: "action", label: t("Add transaction"), run: () => router.push("/finances") });
    list.push({ key: "a-checkin", kind: "action", label: t("Daily check-in"), run: () => router.push("/today") });

    // Navigation.
    for (const n of NAV) {
      list.push({ key: "n-" + n.href, kind: "nav", label: t(n.label), href: n.href, icon: n.icon });
    }
    return list;
  }, [ready, data, date, t, router, toggleHabit, setHabitLog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  function close() {
    setOpen(false);
  }

  function runCmd(c: Cmd) {
    if (c.kind === "weight") {
      setWeightMode(true);
      setTimeout(() => inputRef.current?.focus(), 20);
      return;
    }
    if (c.kind === "nav") router.push(c.href);
    else if (c.kind === "habit" || c.kind === "action") c.run();
    close();
  }

  function saveWeightAndClose() {
    const v = Number(kg);
    if (v > 0) saveWeight({ date, kg: Math.round(v * 10) / 10 });
    close();
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/45 p-3 pt-[12vh] backdrop-blur-sm" onClick={close}>
      <div
        className="card flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {weightMode ? (
          <div className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Scale size={16} className="text-[var(--accent)]" /> {t("Log weight")}
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="kg"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveWeightAndClose();
                  if (e.key === "Escape") close();
                }}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              />
              <button onClick={saveWeightAndClose} disabled={!kg} className="rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-40">
                {t("Save")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-3.5 py-3">
              <Search size={17} className="shrink-0 text-[var(--text-faint)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                  else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) runCmd(filtered[active]); }
                  else if (e.key === "Escape") close();
                }}
                placeholder={t("Search or jump to…")}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]"
              />
              <kbd className="hidden rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-faint)] sm:block">ESC</kbd>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-1.5">
              {filtered.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">{t("No matches.")}</p>
              )}
              {filtered.map((c, i) => (
                <button
                  key={c.key}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => runCmd(c)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${i === active ? "bg-[var(--surface-2)]" : ""}`}
                >
                  <CmdIcon c={c} />
                  <span className="min-w-0 flex-1 truncate">
                    {c.kind === "habit" ? (c.done ? `${t("Undo")}: ${c.label}` : `${t("Mark done")}: ${c.label}`) : c.label}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--text-faint)]">
                    {c.kind === "nav" ? t("Go") : c.kind === "habit" ? t("Habit") : t("Add")}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function CmdIcon({ c }: { c: Cmd }) {
  if (c.kind === "nav") {
    const Icon = c.icon;
    return <Icon size={16} />;
  }
  if (c.kind === "habit")
    return (
      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${c.done ? "bg-[var(--good)] text-white" : "border-2 border-[var(--border)]"}`}>
        {c.done && <Check size={12} strokeWidth={3} />}
      </span>
    );
  if (c.kind === "weight") return <Scale size={16} className="text-[var(--accent)]" />;
  return <Plus size={16} className="text-[var(--accent)]" />;
}

/** Small labelled button used to open the palette (e.g. in the mobile More sheet). */
export function CommandPaletteButton({ className }: { className?: string }) {
  const t = useT();
  return (
    <button
      onClick={openCommandPalette}
      className={className ?? "flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-muted)]"}
    >
      <Plus size={16} className="text-[var(--accent)]" />
      {t("Quick add")}
      <ArrowRight size={14} className="ml-auto text-[var(--text-faint)]" />
    </button>
  );
}
