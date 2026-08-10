"use client";

import clsx from "clsx";
import { Check, Minus, X } from "lucide-react";
import { Habit } from "@/lib/types";
import { HabitToday } from "@/lib/habitView";
import { useStore } from "@/lib/store";
import { fmtDuration } from "@/lib/date";
import { Badge } from "@/components/ui";

/**
 * A single actionable habit row.
 * - build habits: tap the circle to mark done.
 * - reduce habits: tap to record that the behavior happened ("slip"); done=true means it occurred.
 */
export function HabitRow({ item, date }: { item: HabitToday; date: string }) {
  const { toggleHabit } = useStore();
  const { habit, log } = item;
  const isReduce = habit.kind === "reduce";
  const marked = !!log?.done;
  // For build: marked = good (green). For reduce: marked = slip (red).
  const success = isReduce ? !marked : marked;

  return (
    <div className="flex items-center gap-3 rounded-xl px-1 py-2">
      <button
        onClick={() => toggleHabit(habit.id, date)}
        aria-label={isReduce ? "Record occurrence" : "Mark done"}
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition",
          isReduce
            ? marked
              ? "border-[var(--bad)] bg-[var(--bad)] text-white"
              : "border-[var(--good)] text-[var(--good)] hover:bg-[var(--good-soft)]"
            : marked
              ? "border-[var(--good)] bg-[var(--good)] text-white"
              : "border-[var(--border)] text-transparent hover:border-[var(--accent)]",
        )}
      >
        {isReduce ? marked ? <X size={16} /> : <Minus size={14} /> : <Check size={16} strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "truncate text-sm font-medium",
              success && marked !== isReduce ? "" : "",
              isReduce && marked ? "text-[var(--text-muted)]" : "",
            )}
          >
            {habit.name}
          </span>
          {habit.priority === "high" && <Badge tone="accent">High</Badge>}
          {isReduce && <Badge tone="bad">Reduce</Badge>}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-faint)]">
          <span className="capitalize">{habit.area}</span>
          {habit.targetMinutes && <span>· {fmtDuration(habit.targetMinutes)}</span>}
          {habit.targetValue && (
            <span>
              · {habit.targetValue.toLocaleString()} {habit.unit}
            </span>
          )}
          {item.weekTarget !== undefined && (
            <span>
              · {item.weekDone}/{item.weekTarget} this week
            </span>
          )}
        </div>
      </div>

      {isReduce ? (
        <span className={clsx("text-xs font-medium", marked ? "text-[var(--bad)]" : "text-[var(--good)]")}>
          {marked ? "Occurred" : "Avoided"}
        </span>
      ) : (
        marked && <span className="text-xs font-medium text-[var(--good)]">Done</span>
      )}
    </div>
  );
}

export function priorityLabel(h: Habit): string {
  return h.priority;
}
