"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { Habit } from "@/lib/types";
import { AREA_LABELS } from "@/lib/defaults";
import { fmtDuration, isoRange, todayISO } from "@/lib/date";
import { logOf } from "@/lib/habitView";
import { useT } from "@/lib/i18n";
import { Card, PageHeader, Button, Badge, EmptyState, Chip } from "@/components/ui";
import { HabitForm } from "@/components/HabitForm";
import clsx from "clsx";

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
    const window = isoRange(todayISO(), 30);
    let n = 0;
    let hit = 0;
    for (const d of window) {
      const l = logOf(data, h.id, d);
      if (h.kind === "reduce") {
        n++;
        if (!l?.done) hit++;
      } else if (l) {
        n++;
        if (l.done) hit++;
      }
    }
    return n ? Math.round((hit / n) * 100) : 0;
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
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
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
  return (
    <Card className="!p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-1 h-3 w-3 shrink-0 rounded-full"
            style={{ background: h.color ?? "var(--accent)" }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{h.name}</span>
              {isReduce ? <Badge tone="bad">{t("Reduce")}</Badge> : null}
              {h.priority === "high" && <Badge tone="accent">{t("High")}</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
              <span>{t(AREA_LABELS[h.area])}</span>
              <span>·</span>
              <span>{scheduleLabel}</span>
              {h.targetMinutes ? (
                <>
                  <span>·</span>
                  <span>{fmtDuration(h.targetMinutes)}</span>
                </>
              ) : null}
              {h.targetValue ? (
                <>
                  <span>·</span>
                  <span>
                    {h.targetValue.toLocaleString()} {h.unit}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            aria-label="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-[var(--text-faint)] hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
            aria-label="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ring-track)]">
          <div
            className={clsx("h-full rounded-full")}
            style={{
              width: `${Math.max(3, rate)}%`,
              background: rate >= 70 ? "var(--good)" : rate >= 45 ? "var(--warn)" : "var(--bad)",
            }}
          />
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
          {rate >= 50 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {rate}%
        </span>
      </div>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">
        {isReduce ? t("avoided") : t("completed")} · {t("last 30 days")}
      </p>
    </Card>
  );
}
