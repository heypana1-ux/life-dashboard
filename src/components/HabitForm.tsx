"use client";

import { useState } from "react";
import { Habit, AreaKey, Priority, Schedule, HabitKind } from "@/lib/types";
import { AREA_LABELS, HABIT_COLORS } from "@/lib/defaults";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { weekdayLabel } from "@/lib/date";
import { Modal, Field, inputCls, Button, Chip, NumberInput } from "@/components/ui";
import clsx from "clsx";

const AREAS: AreaKey[] = [
  "productivity",
  "sport",
  "learning",
  "creativity",
  "habits",
];

type Draft = Omit<Habit, "id" | "createdAt" | "archived">;
type TargetMode = "none" | "times" | "minutes" | "value";

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
  const { data, addHabit, updateHabit } = useStore();
  const t = useT();
  const [draft, setDraft] = useState<Draft>(editing ? { ...editing } : blank());

  // Existing routine names for quick reuse (habit-stacking).
  const groups = Array.from(
    new Set(data.habits.map((h) => h.group?.trim()).filter((g): g is string => !!g)),
  ).sort();

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

  const targetMode: TargetMode = draft.timesPerDay
    ? "times"
    : draft.targetMinutes
      ? "minutes"
      : draft.targetValue
        ? "value"
        : "none";
  function setTargetMode(m: TargetMode) {
    const base = { targetMinutes: undefined, targetValue: undefined, unit: undefined, timesPerDay: undefined };
    if (m === "times") set({ ...base, timesPerDay: draft.timesPerDay ?? 2 });
    else if (m === "minutes") set({ ...base, targetMinutes: draft.targetMinutes ?? 30 });
    else if (m === "value") set({ ...base, targetValue: draft.targetValue ?? 100, unit: draft.unit ?? "" });
    else set(base);
  }

  function submit() {
    if (!draft.name.trim()) return;
    if (editing) updateHabit(editing.id, draft);
    else addHabit(draft);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t("Edit habit") : t("New habit")} wide>
      <div className="space-y-4">
        <Field label={t("Name")}>
          <input
            className={inputCls}
            placeholder="e.g. Strength Training"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Type")}>
            <div className="flex gap-2">
              {(["build", "reduce"] as HabitKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => set({ kind: k })}
                  className={clsx(
                    "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition",
                    draft.kind === k
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-2)]",
                  )}
                >
                  {k === "build" ? t("Build") : t("Reduce")}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t("Area")}>
            <select
              className={inputCls}
              value={draft.area}
              onChange={(e) => set({ area: e.target.value as AreaKey })}
            >
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {t(AREA_LABELS[a])}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Schedule */}
        <Field label={t("Schedule")}>
          <div className="mb-2 flex flex-wrap gap-2">
            <Chip active={draft.schedule.type === "daily"} onClick={() => setSchedule({ type: "daily" })}>
              {t("Daily")}
            </Chip>
            <Chip
              active={draft.schedule.type === "weekly"}
              onClick={() => setSchedule({ type: "weekly", timesPerWeek: draft.schedule.timesPerWeek ?? 3 })}
            >
              {t("Times / week")}
            </Chip>
            <Chip
              active={draft.schedule.type === "weekdays"}
              onClick={() => setSchedule({ type: "weekdays", days: draft.schedule.days ?? [1, 3, 5] })}
            >
              {t("Specific days")}
            </Chip>
          </div>
          {draft.schedule.type === "weekly" && (
            <NumberInput
              min={1}
              max={7}
              value={draft.schedule.timesPerWeek ?? 3}
              onChange={(n) => n != null && setSchedule({ timesPerWeek: n })}
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
                    {t(weekdayLabel(wd))}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        {draft.kind === "build" && (
          <Field label={t("Daily target (optional)")}>
            <div className="mb-2 flex flex-wrap gap-2">
              {(
                [
                  ["none", "No target"],
                  ["times", "Times per day"],
                  ["minutes", "Minutes"],
                  ["value", "Custom value"],
                ] as [TargetMode, string][]
              ).map(([m, label]) => (
                <Chip key={m} active={targetMode === m} onClick={() => setTargetMode(m)}>
                  {t(label)}
                </Chip>
              ))}
            </div>
            {targetMode === "times" && (
              <div>
                <NumberInput
                  min={1}
                  max={20}
                  value={draft.timesPerDay ?? 2}
                  onChange={(n) => n != null && set({ timesPerDay: Math.max(1, n) })}
                />
                <p className="mt-1 text-xs text-[var(--text-faint)]">
                  {t("Fewer than the target counts partially; more gives a small bonus.")}
                </p>
              </div>
            )}
            {targetMode === "minutes" && (
              <NumberInput
                min={0}
                placeholder={t("e.g. 30")}
                value={draft.targetMinutes}
                onChange={(n) => set({ targetMinutes: n })}
              />
            )}
            {targetMode === "value" && (
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  placeholder={t("Target value")}
                  value={draft.targetValue}
                  onChange={(n) => set({ targetValue: n })}
                />
                <input
                  className={inputCls}
                  placeholder="steps"
                  value={draft.unit ?? ""}
                  onChange={(e) => set({ unit: e.target.value || undefined })}
                />
              </div>
            )}
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Priority")}>
            <select
              className={inputCls}
              value={draft.priority}
              onChange={(e) => set({ priority: e.target.value as Priority })}
            >
              <option value="low">{t("Low")}</option>
              <option value="medium">{t("Medium")}</option>
              <option value="high">{t("High")}</option>
            </select>
          </Field>
          <Field label={`${t("Difficulty")}: ${draft.difficulty}/5`}>
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

        {draft.kind === "build" && (
          <Field
            label={`${t("Importance")}: ${draft.weight ?? 3}/5`}
            hint={t("How much finishing this counts toward your Life Score. Higher = it moves your score more.")}
          >
            <input
              type="range"
              min={1}
              max={5}
              value={draft.weight ?? 3}
              onChange={(e) => set({ weight: Number(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--text-faint)]">
              <span>{t("Nice to have")}</span>
              <span>{t("Essential")}</span>
            </div>
          </Field>
        )}

        {draft.kind === "reduce" && (
          <Field label={`${t("Severity")}: ${draft.severity}/5`}>
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

        <Field label={t("Routine (optional)")} hint={t("Group habits into a routine, e.g. \"Evening routine\", to do them together.")}>
          <input
            className={inputCls}
            list="habit-groups"
            placeholder={t("e.g. Evening routine")}
            value={draft.group ?? ""}
            onChange={(e) => set({ group: e.target.value || undefined })}
          />
          <datalist id="habit-groups">
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </Field>

        <Field label={t("Color")}>
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
            {t("Cancel")}
          </Button>
          <Button onClick={submit} disabled={!draft.name.trim()}>
            {editing ? t("Save changes") : t("Create habit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
