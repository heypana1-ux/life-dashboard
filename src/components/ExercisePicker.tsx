"use client";

import { useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Modal, inputCls } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { EXERCISES, MUSCLES, MUSCLE_LABEL, Muscle, muscleFor } from "@/lib/exercises";

/*
  A proper in-app exercise picker: searchable and grouped by muscle group, so it works well
  on mobile and desktop (replacing the native <datalist>). Falls back to a free custom name.
*/

export function ExercisePicker({
  open,
  onClose,
  onSelect,
  current,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (name: string, muscle: Muscle | undefined) => void;
  current?: string;
}) {
  const t = useT();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  function pick(name: string, muscle: Muscle | undefined) {
    onSelect(name, muscle);
    setQ("");
    onClose();
  }

  const groups = MUSCLES.map((m) => ({
    muscle: m,
    items: EXERCISES.filter((e) => e.muscle === m && (!query || e.name.toLowerCase().includes(query))),
  })).filter((g) => g.items.length > 0);

  const exactMatch = EXERCISES.some((e) => e.name.toLowerCase() === query);

  return (
    <Modal open={open} onClose={onClose} title={t("Choose exercise")} wide>
      <div className="space-y-3">
        <div className="sticky top-0 z-10 -mt-1 bg-[var(--surface)] pb-1">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
            <input
              className={`${inputCls} pl-9`}
              placeholder={t("Search exercises…")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Custom entry when the search doesn't exactly match a catalogue item */}
        {query && !exactMatch && (
          <button
            onClick={() => pick(q.trim(), muscleFor(q.trim()))}
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-3 py-2.5 text-left text-sm hover:border-[var(--accent)]"
          >
            <Plus size={15} className="text-[var(--accent)]" />
            {t("Use")} “<span className="font-medium">{q.trim()}</span>”
          </button>
        )}

        {groups.length === 0 && !query && (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("Start typing to search.")}</p>
        )}

        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.muscle}>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                {t(MUSCLE_LABEL[g.muscle])}
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {g.items.map((e) => {
                  const active = current?.toLowerCase() === e.name.toLowerCase();
                  return (
                    <button
                      key={e.name}
                      onClick={() => pick(e.name, e.muscle)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                        active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <span className="truncate">{e.name}</span>
                      {active && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/** A button styled like an input that opens the picker; shows the current exercise name. */
export function ExerciseSelect({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (name: string, muscle: Muscle | undefined) => void;
  placeholder?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${inputCls} flex items-center justify-between text-left ${value ? "" : "text-[var(--text-faint)]"}`}
      >
        <span className="truncate">{value || placeholder || t("Choose exercise")}</span>
        <Search size={15} className="shrink-0 text-[var(--text-faint)]" />
      </button>
      <ExercisePicker open={open} onClose={() => setOpen(false)} onSelect={onChange} current={value} />
    </>
  );
}
