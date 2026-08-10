"use client";

import { useState } from "react";
import { Habit, AreaKey, Priority, Schedule, HabitKind } from "@/lib/types";
import { AREA_LABELS, HABIT_COLORS } from "@/lib/defaults";
import { useStore } from "@/lib/store";
import { weekdayLabel } from "@/lib/date";
import { Modal, Field, inputCls, Button, Chip } from "@/components/ui";
import clsx from "clsx";

const AREAS: AreaKey[] = [
  "productivity",
  "sport",
  "learning",
  "creativity",
  "habits",
];

type Draft = Omit<Habit, "id" | "createdAt" | "archived">;

function blank(): Draft {
  return {
    name: "",
    area: "habits",
    kind: "build",
    schedule: { type: "daily" },
    priority: "medium",
    difficulty: 3,
    severity: 2,
    color: HABIT_COLORS[0],
  };
}

export function HabitForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Habit;
}) {
  const { addHabit, updateHabit } = useStore();
  const [draft, setDraft] = useState<Draft>(editing ? { ...editing } : blank());

  // reset when opening for a different target
  const key = editing?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (open && key !== lastKey) {
    setLastKey(key);
    setDraft(editing ? { ...editing } : blank());
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setSchedule = (patch: Partial<Schedule>) =>
    setDraft((d) => ({ ...d, schedule: { ...d.schedule, ...patch } }));

  function submit() {
    if (!draft.name.trim()) return;
    if (editing) updateHabit(editing.id, draft);
    else addHabit(draft);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit habit" : "New habit"} wide>
      <div className="space-y-4">
        <Field label="Name">
          <input
            className={inputCls}
            placeholder="e.g. Strength Training"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <div className="flex gap-2">
              {(["build", "reduce"] as HabitKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => set({ kind: k })}
                  className={clsx(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition",
                    draft.kind === k
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-2)]",
                  )}
                >
                  {k === "build" ? "Build" : "Reduce"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Area">
            <select
              className={inputCls}
              value={draft.area}
              onChange={(e) => set({ area: e.target.value as AreaKey })}
            >
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {AREA_LABELS[a]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Schedule */}
        <Field label="Schedule">
          <div className="mb-2 flex flex-wrap gap-2">
            <Chip active={draft.schedule.type === "daily"} onClick={() => setSchedule({ type: "daily" })}>
              Daily
            </Chip>
            <Chip
              active={draft.schedule.type === "weekly"}
              onClick={() => setSchedule({ type: "weekly", timesPerWeek: draft.schedule.timesPerWeek ?? 3 })}
            >
              Times / week
            </Chip>
            <Chip
              active={draft.schedule.type === "weekdays"}
              onClick={() => setSchedule({ type: "weekdays", days: draft.schedule.days ?? [1, 3, 5] })}
            >
              Specific days
            </Chip>
          </div>
          {draft.schedule.type === "weekly" && (
            <input
              type="number"
              min={1}
              max={7}
              className={inputCls}
              value={draft.schedule.timesPerWeek ?? 3}
              onChange={(e) => setSchedule({ timesPerWeek: Number(e.target.value) })}
            />
          )}
          {draft.schedule.type === "weekdays" && (
            <div className="flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((wd) => {
                const on = (draft.schedule.days ?? []).includes(wd);
                return (
                  <button
                    key={wd}
                    onClick={() => {
                      const days = new Set(draft.schedule.days ?? []);
                      if (on) days.delete(wd);
                      else days.add(wd);
                      setSchedule({ days: [...days].sort() });
                    }}
                    className={clsx(
                      "h-9 w-11 rounded-lg text-xs font-medium transition",
                      on ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)]",
                    )}
                  >
                    {weekdayLabel(wd)}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Target minutes (optional)">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={draft.targetMinutes ?? ""}
              onChange={(e) =>
                set({ targetMinutes: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Target value">
              <input
                type="number"
                className={inputCls}
                value={draft.targetValue ?? ""}
                onChange={(e) =>
                  set({ targetValue: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </Field>
            <Field label="Unit">
              <input
                className={inputCls}
                placeholder="steps"
                value={draft.unit ?? ""}
                onChange={(e) => set({ unit: e.target.value || undefined })}
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <select
              className={inputCls}
              value={draft.priority}
              onChange={(e) => set({ priority: e.target.value as Priority })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label={`Difficulty: ${draft.difficulty}/5`}>
            <input
              type="range"
              min={1}
              max={5}
              value={draft.difficulty}
              onChange={(e) => set({ difficulty: Number(e.target.value) })}
              className="mt-3 w-full accent-[var(--accent)]"
            />
          </Field>
        </div>

        {draft.kind === "reduce" && (
          <Field label={`Severity: ${draft.severity}/5`} hint="How much an occurrence lowers your daily score.">
            <input
              type="range"
              min={1}
              max={5}
              value={draft.severity ?? 2}
              onChange={(e) => set({ severity: Number(e.target.value) })}
              className="w-full accent-[var(--bad)]"
            />
          </Field>
        )}

        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => set({ color: c })}
                className={clsx(
                  "h-8 w-8 rounded-full transition",
                  draft.color === c ? "ring-2 ring-offset-2 ring-offset-[var(--surface)]" : "",
                )}
                style={{ background: c, boxShadow: draft.color === c ? `0 0 0 2px ${c}` : undefined }}
              />
            ))}
          </div>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!draft.name.trim()}>
            {editing ? "Save changes" : "Create habit"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
