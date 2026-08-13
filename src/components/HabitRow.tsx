"use client";

import clsx from "clsx";
import { Check, Minus, Plus, X } from "lucide-react";
import { Habit, HabitLog } from "@/lib/types";
import { HabitToday } from "@/lib/habitView";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtDuration } from "@/lib/date";
import { AREA_LABELS } from "@/lib/defaults";
import { AreaKey } from "@/lib/types";
import { Badge } from "@/components/ui";

const areaLabel = (a: AreaKey): string => AREA_LABELS[a];

/**
 * A single actionable habit row.
 * - build habits: tap the circle to mark done.
 * - reduce habits: tap to record that the behavior happened ("slip"); done=true means it occurred.
 */
export function HabitRow({
  item,
  date,
  showAmount = false,
}: {
  item: HabitToday;
  date: string;
  showAmount?: boolean;
}) {
  const { toggleHabit, setHabitLog } = useStore();
  const t = useT();
  const { habit, log } = item;
  const isReduce = habit.kind === "reduce";
  const isCount = !isReduce && !!habit.timesPerDay;
  const countTarget = habit.timesPerDay ?? 0;
  const count = log?.count ?? 0;
  const marked = isCount ? count > 0 : !!log?.done;
  // For build: marked = good (green). For reduce: marked = slip (red).
  const success = isReduce ? !marked : marked;

  function setCount(n: number) {
    const c = Math.max(0, n);
    setHabitLog({ ...log, habitId: habit.id, date, count: c, done: c > 0 });
  }
  function onCircle() {
    if (isCount) setCount(marked ? 0 : countTarget);
    else toggleHabit(habit.id, date);
  }

  const amountKind = habit.targetMinutes ? "minutes" : habit.targetValue ? "value" : null;
  const canEnterAmount = showAmount && !isReduce && amountKind !== null;
  const amountVal = amountKind === "minutes" ? log?.minutes : log?.value;
  const amountTarget = amountKind === "minutes" ? habit.targetMinutes : habit.targetValue;
  const amountUnit = amountKind === "minutes" ? "min" : habit.unit ?? "";

  return (
    <div className="flex items-center gap-3 rounded-xl px-1 py-2">
      <button
        onClick={onCircle}
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
          {habit.priority === "high" && <Badge tone="accent">{t("High")}</Badge>}
          {isReduce && <Badge tone="bad">{t("Reduce")}</Badge>}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-faint)]">
          <span>{t(areaLabel(habit.area))}</span>
          {isCount && <span>· {countTarget}× {t("per day")}</span>}
          {habit.targetMinutes && <span>· {fmtDuration(habit.targetMinutes)}</span>}
          {habit.targetValue && (
            <span>
              · {habit.targetValue.toLocaleString()} {habit.unit}
            </span>
          )}
          {item.weekTarget !== undefined && (
            <span>
              · {item.weekDone}/{item.weekTarget} {t("this week")}
            </span>
          )}
        </div>
      </div>

      {isCount && showAmount && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCount(count - 1)}
            disabled={count <= 0}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] enabled:hover:bg-[var(--surface-3)] disabled:opacity-40"
            aria-label={t("Less")}
          >
            <Minus size={14} />
          </button>
          <span
            className={clsx(
              "num min-w-[42px] text-center text-sm font-semibold tabular-nums",
              count >= countTarget && count > 0 ? "text-[var(--good)]" : "text-[var(--text)]",
            )}
          >
            {count}/{countTarget}
          </span>
          <button
            onClick={() => setCount(count + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
            aria-label={t("More")}
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      {canEnterAmount && (
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={String(amountTarget)}
            value={amountVal ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const n = v ? Number(v) : undefined;
              const next: HabitLog = { ...log, habitId: habit.id, date, done: n != null && n > 0 };
              if (amountKind === "minutes") next.minutes = n;
              else next.value = n;
              setHabitLog(next);
            }}
            className="w-14 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-right text-xs outline-none focus:border-[var(--accent)]"
            aria-label={t("Amount")}
          />
          <span className="w-8 text-xs text-[var(--text-faint)]">{amountUnit}</span>
        </div>
      )}

      {isReduce ? (
        <span className={clsx("text-xs font-medium", marked ? "text-[var(--bad)]" : "text-[var(--good)]")}>
          {marked ? t("Occurred") : t("Avoided")}
        </span>
      ) : (
        marked && !canEnterAmount && !(isCount && showAmount) && (
          <span className="text-xs font-medium text-[var(--good)]">{t("Done")}</span>
        )
      )}
    </div>
  );
}

export function priorityLabel(h: Habit): string {
  return h.priority;
}
