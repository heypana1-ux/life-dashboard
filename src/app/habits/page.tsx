"use client";

import { useState } from "react";
import {
  Dumbbell,
  Flame,
  GraduationCap,
  type LucideIcon,
  Moon,
  Palette,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { AreaKey, Habit } from "@/lib/types";
import { fmtDuration } from "@/lib/date";
import { habitCurrentStreak, habitHeatmap, habit30dRate } from "@/lib/habitStats";
import { useT } from "@/lib/i18n";
import { PageHeader, Button, Badge, EmptyState, Chip } from "@/components/ui";
import { HabitForm } from "@/components/HabitForm";

const AREA_ICON: Partial<Record<AreaKey, LucideIcon>> = {
  sport: Dumbbell,
  productivity: Zap,
  learning: GraduationCap,
  creativity: Palette,
  sleep: Moon,
  habits: Repeat,
};

export default function HabitsPage() {
  const { data, removeHabit } = useStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | undefined>();
  const [filter, setFilter] = useState<"all" | "build" | "reduce">("all");

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
          <Button
            onClick={() => {
              setEditing(undefined);
              setOpen(true);
            }}
          >
            <Plus size={16} /> {t("New habit")}
          </Button>
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
    </div>
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
  const streak = habitCurrentStreak(data, h);
  const Icon = AREA_ICON[h.area] ?? Repeat;
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
          {h.priority === "high" && <Badge tone="accent">{t("High")}</Badge>}
        </div>
        <div className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
          {scheduleLabel} · {rate}% {t("adherence")}
          {h.targetMinutes ? ` · ${fmtDuration(h.targetMinutes)}` : ""}
        </div>
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
