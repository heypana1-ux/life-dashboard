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
  // How a set of this exercise is counted, and whether it moves your own body weight. Both
  // are stored with the exercise, so the runner asks for seconds (or "+kg") from then on.
  const [customMode, setCustomMode] = useState<"reps" | "time">("reps");
  const [customBodyweight, setCustomBodyweight] = useState(false);
  const query = q.trim().toLowerCase();

  const custom = useMemo(() => data.settings.customExercises ?? [], [data.settings.customExercises]);
  const customNames = useMemo(() => new Set(custom.map((e) => e.name.toLowerCase())), [custom]);

  function pick(name: string, muscle: Muscle | undefined) {
    onSelect(name, muscle);
    setQ("");
    setCustomMuscle("");
    setCustomMode("reps");
    setCustomBodyweight(false);
    onClose();
  }

  /** Adds a name the catalogue doesn't have, so it's there the next time too. */
  function addCustom() {
    const name = q.trim();
    if (!name) return;
    const muscle = (customMuscle || muscleFor(name) || "fullbody") as Muscle;
    if (!customNames.has(name.toLowerCase())) {
      updateSettings({
        customExercises: [...custom, { name, muscle, mode: customMode, bodyweight: customBodyweight || undefined }],
      });
    }
    pick(name, muscle);
  }

  function forget(name: string) {
    updateSettings({ customExercises: custom.filter((e) => e.name !== name) });
  }

  const all = useMemo(
    () => [
      ...EXERCISES.map((e) => ({ name: e.name, muscle: e.muscle, custom: false, mode: e.mode })),
      ...custom.map((e) => ({ name: e.name, muscle: e.muscle as Muscle, custom: true, mode: e.mode })),
    ],
    [custom],
  );

  const matches = (e: { name: string }) => !query || e.name.toLowerCase().includes(query);
  // Your own exercises are pinned at the top: that's where you go to fix a typo, and hunting
  // for one among a hundred built-ins would make deleting it a treasure hunt.
  const mine = all.filter((e) => e.custom && matches(e));
  const groups = MUSCLES.map((m) => ({
    muscle: m,
    items: all.filter((e) => !e.custom && e.muscle === m && matches(e)),
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
              <span className="w-24 shrink-0 text-xs text-[var(--text-faint)]">{t("Muscle group")}</span>
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
            <div className="mt-2 flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-[var(--text-faint)]">{t("Counted in")}</span>
              <div className="flex flex-1 gap-1.5">
                {(["reps", "time"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setCustomMode(m)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-[12.5px] font-medium ${
                      customMode === m
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]"
                    }`}
                  >
                    {m === "reps" ? `${t("Reps")} · kg` : t("Seconds")}
                  </button>
                ))}
              </div>
            </div>
            {customMode === "reps" && (
              <label className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={customBodyweight}
                  onChange={(e) => setCustomBodyweight(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                {t("Bodyweight exercise (your weight counts as the load)")}
              </label>
            )}
            <p className="mt-1.5 text-[11px] text-[var(--text-faint)]">{t("Saved for next time.")}</p>
          </div>
        )}

        {groups.length === 0 && !query && (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("Start typing to search.")}</p>
        )}

        <div className="space-y-4">
          {mine.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                {t("Your exercises")}
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {mine.map((e) => (
                  <ExerciseRow
                    key={e.name}
                    item={e}
                    active={current?.toLowerCase() === e.name.toLowerCase()}
                    onPick={() => pick(e.name, e.muscle)}
                    onForget={() => forget(e.name)}
                    forgetLabel={t("Remove from the list")}
                  />
                ))}
              </div>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.muscle}>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                {t(MUSCLE_LABEL[g.muscle])}
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {g.items.map((e) => (
                  <ExerciseRow
                    key={e.name}
                    item={e}
                    active={current?.toLowerCase() === e.name.toLowerCase()}
                    onPick={() => pick(e.name, e.muscle)}
                  />
                ))}
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

/** One row in the picker: tap to choose, and — for your own entries — an × to forget it. */
function ExerciseRow({
  item,
  active,
  onPick,
  onForget,
  forgetLabel,
}: {
  item: { name: string; mode?: string };
  active: boolean;
  onPick: () => void;
  onForget?: () => void;
  forgetLabel?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-lg pr-1 transition ${
        active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-[var(--surface-2)]"
      }`}
    >
      <button onClick={onPick} className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm">
        <span className="truncate">
          {item.name}
          {item.mode === "time" && <span className="ml-1.5 text-[11px] text-[var(--text-faint)]">s</span>}
        </span>
        {active && <Check size={14} className="shrink-0" />}
      </button>
      {onForget && (
        <button
          onClick={onForget}
          aria-label={forgetLabel}
          title={forgetLabel}
          className="shrink-0 rounded p-1 text-[var(--text-faint)] hover:text-[var(--bad)]"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
