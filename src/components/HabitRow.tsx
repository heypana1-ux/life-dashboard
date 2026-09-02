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
import { AREA_ICONS, areaColor } from "@/lib/areaStyle";
import { Badge, IconTile } from "@/components/ui";

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
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={clsx(
              "line-clamp-2 break-words text-[13.5px] font-medium leading-snug",
              struck && "text-[var(--text-muted)] line-through",
            )}
          >
            {habit.name}
          </span>
          {habit.priority === "high" && <span className="shrink-0"><Badge tone="accent">{t("High")}</Badge></span>}
          {isReduce && <span className="shrink-0"><Badge tone="bad">{t("Reduce")}</Badge></span>}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-[var(--text-faint)]">{metaParts.join(" · ")}</div>
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
          <span className={clsx("num min-w-[38px] text-center text-sm font-semibold tabular-nums", count >= countTarget && count > 0 ? "text-[var(--good)]" : "text-[var(--text)]")}>
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
            className="w-12 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-right text-xs outline-none focus:border-[var(--accent)]"
            aria-label={t("Amount")}
          />
          <span className="text-[11px] text-[var(--text-faint)]">{amountUnit}</span>
        </div>
      )}

      {!isCount && (
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
      )}
    </div>
  );
}

export function priorityLabel(h: Habit): string {
  return h.priority;
}
