"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { Modal, inputCls } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { EXERCISES, MUSCLES, MUSCLE_LABEL, Muscle, muscleFor } from "@/lib/exercises";

/*
  A proper in-app exercise picker: searchable and grouped by muscle group, so it works well
  on mobile and desktop (replacing the native <datalist>).

  An exercise the catalogue doesn't have is typed once and then kept: it's stored in settings
  with the muscle group you assign it and shows up in the list from then on, so a gym's odd
  machine or your own variation doesn't have to be re-typed every session.
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
  const { data, updateSettings } = useStore();
  const [q, setQ] = useState("");
  const [customMuscle, setCustomMuscle] = useState<Muscle | "">("");
  const query = q.trim().toLowerCase();

  const custom = useMemo(() => data.settings.customExercises ?? [], [data.settings.customExercises]);
  const customNames = useMemo(() => new Set(custom.map((e) => e.name.toLowerCase())), [custom]);

  function pick(name: string, muscle: Muscle | undefined) {
    onSelect(name, muscle);
    setQ("");
    setCustomMuscle("");
    onClose();
  }

  /** Adds a name the catalogue doesn't have, so it's there the next time too. */
  function addCustom() {
    const name = q.trim();
    if (!name) return;
    const muscle = (customMuscle || muscleFor(name) || "fullbody") as Muscle;
    if (!customNames.has(name.toLowerCase())) {
      updateSettings({ customExercises: [...custom, { name, muscle }] });
    }
    pick(name, muscle);
  }

  function forget(name: string) {
    updateSettings({ customExercises: custom.filter((e) => e.name !== name) });
  }

  const all = useMemo(
    () => [
      ...EXERCISES.map((e) => ({ name: e.name, muscle: e.muscle, custom: false })),
      ...custom.map((e) => ({ name: e.name, muscle: e.muscle as Muscle, custom: true })),
    ],
    [custom],
  );

  const groups = MUSCLES.map((m) => ({
    muscle: m,
    items: all.filter((e) => e.muscle === m && (!query || e.name.toLowerCase().includes(query))),
  })).filter((g) => g.items.length > 0);

  const exactMatch = all.some((e) => e.name.toLowerCase() === query);

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

        {/* Custom entry when the search doesn't exactly match anything we know */}
        {query && !exactMatch && (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-2.5">
            <button
              onClick={addCustom}
              className="flex w-full items-center gap-2 text-left text-sm"
            >
              <Plus size={15} className="text-[var(--accent)]" />
              {t("Add")} “<span className="font-medium">{q.trim()}</span>”
            </button>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-[var(--text-faint)]">{t("Muscle group")}</span>
              <select
                className={`${inputCls} !py-1.5 w-auto flex-1`}
                value={customMuscle || muscleFor(q.trim()) || "fullbody"}
                onChange={(e) => setCustomMuscle(e.target.value as Muscle)}
              >
                {MUSCLES.map((m) => (
                  <option key={m} value={m}>{t(MUSCLE_LABEL[m])}</option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--text-faint)]">{t("Saved for next time.")}</p>
          </div>
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
                    <div
                      key={e.name}
                      className={`flex items-center gap-1 rounded-lg pr-1 transition ${
                        active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <button
                        onClick={() => pick(e.name, e.muscle)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                      >
                        <span className="truncate">{e.name}</span>
                        {active && <Check size={14} className="shrink-0" />}
                      </button>
                      {e.custom && (
                        <button
                          onClick={() => forget(e.name)}
                          aria-label={t("Remove")}
                          title={t("Remove")}
                          className="shrink-0 rounded p-1 text-[var(--text-faint)] hover:text-[var(--bad)]"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
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
