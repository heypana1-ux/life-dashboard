"use client";

import { useState } from "react";
import { CalendarRange, Check, Pencil, Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { todayISO, addDays, fmtShort } from "@/lib/date";
import { weekAnchor } from "@/lib/recap";
import { Card, SectionTitle, Button, Modal, Field, inputCls } from "@/components/ui";
import clsx from "clsx";

/** Forward-looking weekly plan: set an intention + a few focus habits for the coming week. */
export function WeeklyPlanner() {
  const { data, saveWeeklyPlan } = useStore();
  const t = useT();
  const today = todayISO();
  const week = weekAnchor(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const plan = data.weeklyPlans.find((p) => p.weekOf === week);
  const buildHabits = data.habits.filter((h) => h.kind === "build" && !h.archived);

  const [open, setOpen] = useState(false);
  const [intention, setIntention] = useState(plan?.intention ?? "");
  const [focus, setFocus] = useState<string[]>(plan?.focusHabitIds ?? []);

  const focusHabits = (plan?.focusHabitIds ?? [])
    .map((id) => buildHabits.find((h) => h.id === id))
    .filter((h): h is NonNullable<typeof h> => !!h);

  function doneThisWeek(habitId: string): number {
    return data.habitLogs.filter((l) => l.habitId === habitId && l.done && weekDates.includes(l.date)).length;
  }

  function openEditor() {
    setIntention(plan?.intention ?? "");
    setFocus(plan?.focusHabitIds ?? []);
    setOpen(true);
  }
  function toggle(id: string) {
    setFocus((f) => (f.includes(id) ? f.filter((x) => x !== id) : f.length >= 3 ? f : [...f, id]));
  }
  function save() {
    saveWeeklyPlan({ weekOf: week, intention: intention.trim() || undefined, focusHabitIds: focus });
    setOpen(false);
  }

  const hasPlan = !!plan && (!!plan.intention || (plan.focusHabitIds?.length ?? 0) > 0);

  return (
    <Card>
      <SectionTitle
        right={
          <button onClick={openEditor} className="flex items-center gap-1 text-xs text-[var(--text-faint)] hover:text-[var(--text)]">
            <Pencil size={13} /> {hasPlan ? t("Edit") : t("Plan")}
          </button>
        }
      >
        {t("This week's plan")}
      </SectionTitle>

      {!hasPlan ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            {t("Set an intention and pick up to 3 focus habits for the week ahead.")}
          </p>
          <Button size="sm" onClick={openEditor}>
            <CalendarRange size={15} /> {t("Plan")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {plan!.intention && (
            <p className="border-l-2 border-[var(--accent)] pl-3 text-sm italic text-[var(--text-muted)]">“{plan!.intention}”</p>
          )}
          {focusHabits.length > 0 && (
            <div className="space-y-2">
              {focusHabits.map((h) => {
                const n = doneThisWeek(h.id);
                return (
                  <div key={h.id} className="flex items-center gap-2.5 text-sm">
                    <Target size={14} className="shrink-0 text-[var(--accent)]" />
                    <span className="min-w-0 flex-1 truncate">{h.name}</span>
                    <span className="num shrink-0 text-xs font-semibold text-[var(--text-muted)]">{t("{n}× this week", { n })}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-[var(--text-faint)]">{t("Week of {date}", { date: fmtShort(week) })}</p>
        </div>
      )}

      {open && (
        <Modal open onClose={() => setOpen(false)} title={t("Plan your week")}>
          <div className="space-y-4">
            <Field label={t("Your intention for the week")}>
              <textarea
                className={inputCls}
                rows={2}
                autoFocus
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder={t("e.g. Protect my mornings and train 3×")}
              />
            </Field>
            <div>
              <div className="mb-1.5 text-sm font-medium">{t("Focus habits")} <span className="text-xs font-normal text-[var(--text-faint)]">({focus.length}/3)</span></div>
              {buildHabits.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">{t("Add some habits first to pick focus ones.")}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {buildHabits.map((h) => {
                    const on = focus.includes(h.id);
                    return (
                      <button
                        key={h.id}
                        onClick={() => toggle(h.id)}
                        disabled={!on && focus.length >= 3}
                        className={clsx(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                          on ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] enabled:hover:border-[var(--accent)] disabled:opacity-40",
                        )}
                      >
                        {on && <Check size={13} />} {h.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
              <Button onClick={save}>{t("Save plan")}</Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
