"use client";

import clsx from "clsx";
import { Check, X } from "lucide-react";
import { Habit, HabitLog } from "@/lib/types";
import { HabitToday } from "@/lib/habitView";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtDuration } from "@/lib/date";
import { AREA_LABELS } from "@/lib/defaults";
import { AreaKey } from "@/lib/types";
import { AREA_ICONS, areaColor } from "@/lib/areaStyle";
import { IconTile } from "@/components/ui";

const areaLabel = (a: AreaKey): string => AREA_LABELS[a];

/**
 * A single actionable habit row — "Pulse" style: area icon tile, name + meta, an optional
 * amount/count control, and a check circle on the right.
 * - build habits: tap the circle to mark done.
 * - reduce habits: tap to record that the behavior happened ("slip"); done=true means it occurred.
 */
export function HabitRow({
  item,
  date,
  showAmount = false,
  meta,
}: {
  item: HabitToday;
  date: string;
  showAmount?: boolean;
  /** Overrides the default meta line (Today passes the schedule, e.g. "Daily · 45 min"). */
  meta?: string;
}) {
  const { toggleHabit, setHabitLog } = useStore();
  const t = useT();
  const { habit, log } = item;
  const isReduce = habit.kind === "reduce";
  const isCount = !isReduce && !!habit.timesPerDay;
  const countTarget = habit.timesPerDay ?? 0;
  const count = log?.count ?? 0;
  const marked = isCount ? count > 0 : !!log?.done;
  const Icon = AREA_ICONS[habit.area];
  const color = areaColor(habit.area);

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

  const metaParts = [t(areaLabel(habit.area))];
  if (isCount) metaParts.push(`${countTarget}× ${t("per day")}`);
  if (habit.targetMinutes && !canEnterAmount) metaParts.push(fmtDuration(habit.targetMinutes));
  if (habit.targetValue && !canEnterAmount) metaParts.push(`${habit.targetValue.toLocaleString()} ${habit.unit ?? ""}`.trim());
  if (item.weekTarget !== undefined) metaParts.push(`${item.weekDone}/${item.weekTarget}× ${t("wk")}`);

  const struck = isReduce ? !marked : marked;

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] py-[11px] last:border-0">
      <IconTile color={color}>
        <Icon size={15} strokeWidth={2} />
      </IconTile>

      <div className="min-w-0 flex-1">
        <span
          className={clsx(
            "block line-clamp-2 break-words text-[13.5px] font-medium leading-snug",
            struck && "text-[var(--text-muted)] line-through",
          )}
        >
          {habit.name}
        </span>
        <div className="mt-0.5 truncate text-[11.5px] text-[var(--text-faint)]">{meta ?? metaParts.join(" · ")}</div>
      </div>

      {/* Progress reads as plain right-aligned text, as in the design. */}
      {isCount && showAmount && (
        <button
          onClick={() => setCount(count >= countTarget ? 0 : count + 1)}
          className="num shrink-0 text-[11.5px] font-semibold tabular-nums text-[var(--text-muted)]"
          aria-label={t("More")}
        >
          {count}/{countTarget}
        </button>
      )}

      {canEnterAmount && (
        <div className="flex shrink-0 items-baseline">
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
            className="num w-[34px] border-0 bg-transparent p-0 text-right text-[11.5px] font-semibold tabular-nums text-[var(--text-muted)] outline-none [appearance:textfield] placeholder:text-[var(--text-dim)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label={t("Amount")}
          />
          <span className="text-[11.5px] font-semibold text-[var(--text-muted)]">
            {amountKind === "minutes" ? "m" : `/${amountTarget}`}
          </span>
        </div>
      )}

      <button
        onClick={onCircle}
        aria-label={isReduce ? "Record occurrence" : "Mark done"}
        className={clsx(
          "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition active:scale-90",
          marked && !isReduce && "pop",
          isReduce
            ? marked
              ? "border-transparent bg-[var(--bad)] text-white"
              : "border-[var(--border)] text-transparent hover:border-[var(--bad)]"
            : marked
              ? "area-grad border-transparent"
              : "border-[var(--border)] text-transparent hover:border-[var(--area-a)]",
        )}
      >
        {isReduce ? marked ? <X size={14} strokeWidth={2.6} /> : null : marked ? <Check size={14} strokeWidth={2.6} /> : null}
      </button>
    </div>
  );
}

export function priorityLabel(h: Habit): string {
  return h.priority;
}
