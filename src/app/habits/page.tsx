"use client";

import { useState } from "react";
import {
  Flame,
  LayoutTemplate,
  Pencil,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { CheckCircle2, Circle, Layers, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { Habit } from "@/lib/types";
import { fmtDuration, todayISO } from "@/lib/date";
import { habitsForToday } from "@/lib/habitView";
import { useDerived } from "@/lib/useDerived";
import { habitCurrentStreak, habitHeatmap, habit30dRate, habitLifeScoreImpact } from "@/lib/habitStats";
import { HABIT_TEMPLATE_GROUPS } from "@/lib/templates";
import { AREA_ICONS } from "@/lib/areaStyle";
import { AREA_LABELS } from "@/lib/defaults";
import { useT } from "@/lib/i18n";
import { PageHeader, Button, Badge, EmptyState, Chip, Modal, Card, SectionTitle } from "@/components/ui";
import { HabitForm } from "@/components/HabitForm";
import { HintCard } from "@/components/HintCard";

export default function HabitsPage() {
  const { data, removeHabit, addHabit } = useStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | undefined>();
  const [filter, setFilter] = useState<"all" | "build" | "reduce">("all");
  const [tpl, setTpl] = useState(false);

  const habits = data.habits
    .filter((h) => !h.archived)
    .filter((h) => filter === "all" || h.kind === filter);

  const build = habits.filter((h) => h.kind === "build");
  const reduce = habits.filter((h) => h.kind === "reduce");

  function scheduleLabel(h: Habit): string {
    if (h.schedule.type === "daily") return t("Daily");
    if (h.schedule.type === "weekly") return `${h.schedule.timesPerWeek}× / ${t("week")}`;
    return `${(h.schedule.days ?? []).length} ${t("days / week")}`;
  }

  /** 30-day completion rate for a build habit / avoidance rate for a reduce habit. */
  function rate(h: Habit): number {
    return habit30dRate(data, h);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Habits")}
        subtitle={t("Build good routines, reduce the ones you don't want.")}
        action={
          <div className="flex items-center gap-2">
            <Button variant="soft" onClick={() => setTpl(true)}>
              <LayoutTemplate size={16} /> {t("Library")}
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus size={16} /> {t("New habit")}
            </Button>
          </div>
        }
      />

      <div className="flex gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          {t("All")}
        </Chip>
        <Chip active={filter === "build"} onClick={() => setFilter("build")}>
          {t("Build")} ({data.habits.filter((h) => h.kind === "build" && !h.archived).length})
        </Chip>
        <Chip active={filter === "reduce"} onClick={() => setFilter("reduce")}>
          {t("Reduce")} ({data.habits.filter((h) => h.kind === "reduce" && !h.archived).length})
        </Chip>
      </div>

      <HintCard id="routines" title={t("Stack habits into routines")}>
        {t("Give related habits the same routine name (in the habit editor) — e.g. \"Evening routine\" — to group them and complete them together.")}
      </HintCard>

      <RoutinesCard />

      {habits.length === 0 ? (
        <EmptyState
          title={t("No habits yet")}
          hint={t("Create your first habit to start tracking. Habits can be daily, a number of times per week, or on specific weekdays.")}
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> {t("New habit")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {(filter === "all" || filter === "build") && build.length > 0 && (
            <Section title={t("Build")}>
              {build.map((h) => (
                <HabitCard
                  key={h.id}
                  h={h}
                  rate={rate(h)}
                  scheduleLabel={scheduleLabel(h)}
                  onEdit={() => {
                    setEditing(h);
                    setOpen(true);
                  }}
                  onDelete={() => removeHabit(h.id)}
                />
              ))}
            </Section>
          )}
          {(filter === "all" || filter === "reduce") && reduce.length > 0 && (
            <Section title={t("Reduce")}>
              {reduce.map((h) => (
                <HabitCard
                  key={h.id}
                  h={h}
                  rate={rate(h)}
                  scheduleLabel={scheduleLabel(h)}
                  onEdit={() => {
                    setEditing(h);
                    setOpen(true);
                  }}
                  onDelete={() => removeHabit(h.id)}
                />
              ))}
            </Section>
          )}
        </div>
      )}

      <HabitForm open={open} onClose={() => setOpen(false)} editing={editing} />
      <TemplatesModal open={tpl} onClose={() => setTpl(false)} onAdd={(h) => addHabit(h)} existing={new Set(data.habits.map((h) => h.name.toLowerCase()))} />
    </div>
  );
}

function TemplatesModal({
  open,
  onClose,
  onAdd,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (h: (typeof HABIT_TEMPLATE_GROUPS)[number]["items"][number]) => void;
  existing: Set<string>;
}) {
  const t = useT();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const groups = HABIT_TEMPLATE_GROUPS.map((g) => ({
    group: g.group,
    items: g.items.filter((h) => !query || t(h.name).toLowerCase().includes(query) || h.name.toLowerCase().includes(query)),
  })).filter((g) => g.items.length > 0);
  return (
    <Modal open={open} onClose={onClose} title={t("Habit library")} wide>
      <p className="mb-3 text-sm text-[var(--text-muted)]">{t("Add a ready-made habit, then tweak it any way you like.")}</p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("Search habits…")}
        className="mb-4 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />
      <div className="space-y-4">
        {groups.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("Nothing found.")}</p>}
        {groups.map((g) => (
          <div key={g.group}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">{t(g.group)}</div>
            <div className="flex flex-wrap gap-2">
              {g.items.map((h) => {
                const added = existing.has(h.name.toLowerCase());
                return (
                  <button
                    key={h.name}
                    disabled={added}
                    onClick={() => onAdd(h)}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-medium enabled:hover:border-[var(--accent)] disabled:opacity-40"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: h.color }} />
                    {t(h.name)}
                    <span className="text-xs text-[var(--text-faint)]">· {t(AREA_LABELS[h.area])}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={onClose}>{t("Done")}</Button>
      </div>
    </Modal>
  );
}

/* ---------------- Habit-stacking routines ---------------- */

function RoutinesCard() {
  const { data, setHabitLog } = useStore();
  const t = useT();
  const today = todayISO();

  // Group non-archived habits by their routine name.
  const groups = new Map<string, Habit[]>();
  for (const h of data.habits) {
    if (h.archived || !h.group?.trim()) continue;
    const key = h.group.trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(h);
  }
  if (groups.size === 0) return null;

  const dueToday = new Set(habitsForToday(data, today).map((g) => g.habit.id));
  const doneToday = new Set(
    data.habitLogs.filter((l) => l.date === today && l.done).map((l) => l.habitId),
  );

  function completeAll(habits: Habit[]) {
    for (const h of habits) {
      if (h.kind !== "build" || !dueToday.has(h.id) || doneToday.has(h.id)) continue;
      const extra = h.timesPerDay ? { count: h.timesPerDay } : {};
      setHabitLog({ habitId: h.id, date: today, done: true, ...extra });
    }
  }

  return (
    <Card>
      <SectionTitle right={<Layers size={16} className="text-[var(--text-faint)]" />}>{t("Routines")}</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {[...groups.entries()].map(([name, habits]) => {
          const due = habits.filter((h) => h.kind === "build" && dueToday.has(h.id));
          const doneCount = due.filter((h) => doneToday.has(h.id)).length;
          const allDone = due.length > 0 && doneCount === due.length;
          return (
            <div key={name} className="tile p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold">{name}</span>
                {due.length > 0 && (
                  <span className="text-xs text-[var(--text-faint)]">{doneCount}/{due.length} {t("today")}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {habits.map((h) => {
                  const isDue = dueToday.has(h.id);
                  const done = doneToday.has(h.id);
                  return (
                    <div key={h.id} className="flex items-center gap-2 text-sm">
                      {h.kind === "build" && isDue ? (
                        done ? (
                          <CheckCircle2 size={15} className="shrink-0 text-[var(--good)]" />
                        ) : (
                          <Circle size={15} className="shrink-0 text-[var(--text-faint)]" />
                        )
                      ) : (
                        <span className="h-[15px] w-[15px] shrink-0 rounded-full" style={{ background: h.color ?? "var(--surface-3)" }} />
                      )}
                      <span className={done ? "text-[var(--text-faint)] line-through" : ""}>{h.name}</span>
                      {h.kind === "build" && !isDue && (
                        <span className="text-[10px] text-[var(--text-faint)]">· {t("not today")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {due.length > 0 && (
                <Button
                  variant={allDone ? "soft" : "primary"}
                  size="sm"
                  className="mt-3 w-full"
                  disabled={allDone}
                  onClick={() => completeAll(habits)}
                >
                  {allDone ? t("All done today 🎉") : t("Complete all today")}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="slabel mb-2.5">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function HabitCard({
  h,
  rate,
  scheduleLabel,
  onEdit,
  onDelete,
}: {
  h: Habit;
  rate: number;
  scheduleLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isReduce = h.kind === "reduce";
  const t = useT();
  const { data } = useStore();
  const d = useDerived();
  const streak = habitCurrentStreak(data, h);
  const impact = habitLifeScoreImpact(data, d.history, h);
  const Icon = AREA_ICONS[h.area] ?? Repeat;
  const dots = habitHeatmap(data, h).slice(-30);
  const heatColor = (lvl: string) =>
    lvl === "done" ? "var(--good)" : lvl === "missed" ? "var(--bad-soft)" : "var(--surface-3)";

  return (
    <div className="tile flex items-center gap-4 p-[18px] sm:gap-5 sm:px-[22px]">
      <div
        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--accent-soft)]"
        style={{ color: h.color ?? "var(--accent)" }}
      >
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-[9px]">
          <span className="truncate text-[15px] font-semibold">{h.name}</span>
          {isReduce ? <Badge tone="bad">{t("Reduce")}</Badge> : <Badge>{t("Build")}</Badge>}
          {!isReduce && (h.weight ?? 0) >= 4 && <Badge tone="accent">{t("Key habit")}</Badge>}
          {h.priority === "high" && <Badge tone="accent">{t("High")}</Badge>}
        </div>
        <div className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
          {scheduleLabel} · {rate}% {t("adherence")}
          {h.timesPerDay ? ` · ${h.timesPerDay}× ${t("per day")}` : ""}
          {h.targetMinutes ? ` · ${fmtDuration(h.targetMinutes)}` : ""}
        </div>
        {impact && Math.abs(impact.pct) >= 5 && (
          <div className="mt-1 flex items-center gap-1.5 text-[12px]">
            <TrendingUp size={12} className={impact.pct >= 0 ? "text-[var(--good)]" : "text-[var(--bad)]"} />
            <span className="font-semibold" style={{ color: impact.pct >= 0 ? "var(--good)" : "var(--bad)" }}>
              {impact.pct >= 0 ? "+" : ""}{impact.pct}%
            </span>
            <span className="text-[var(--text-faint)]">{t("Life Score on days you do this")}</span>
          </div>
        )}
      </div>

      <div className="hidden items-center gap-[3px] lg:flex">
        {dots.map((c) => (
          <span
            key={c.date}
            className="h-[9px] w-[9px] rounded-[2px]"
            style={{ background: heatColor(c.level) }}
            title={c.date}
          />
        ))}
      </div>

      <div className="min-w-[64px] text-right">
        <div className="flex items-center justify-end gap-[5px] text-[var(--warn)]">
          <Flame size={14} />
          <span className="num text-[17px] font-bold">{streak}</span>
        </div>
        <div className="text-[11px] text-[var(--text-faint)]">{t("day streak")}</div>
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          aria-label={t("Edit")}
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
          aria-label={t("Delete")}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
