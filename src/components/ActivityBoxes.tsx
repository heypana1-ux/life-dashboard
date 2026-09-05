"use client";

import { useEffect, useRef } from "react";
import { ActivityState, mondayIndex } from "@/lib/activity";
import { fmtShort, weekdayLabel } from "@/lib/date";
import { useT } from "@/lib/i18n";

/*
  Filled box = done, empty box = not done. The third state is a box that's barely there:
  a day that was never on the plan (or hasn't happened yet), which shouldn't read as a miss.

  Two layouts over the same cells:
    week     — seven boxes with their weekday letters, for Today and a habit card
    calendar — rows of seven, Monday first, for a month
    year     — GitHub-style columns of seven, scrolled to the most recent week
*/

// Filled = done. An outlined, hollow box = a day you missed. A flat faint tile = a day that
// was never on the plan. Two shades of grey would read as the same thing at this size, so the
// outline does the work; it's mixed from the text colour to stay visible in both themes.
const STATE_CLASS: Record<ActivityState, string> = {
  done: "grad",
  open: "",
  off: "bg-[var(--surface-3)]",
};

const STATE_STYLE: Record<ActivityState, React.CSSProperties | undefined> = {
  done: undefined,
  open: { border: "1.5px solid color-mix(in srgb, var(--text-faint) 45%, transparent)" },
  off: undefined,
};

/** Two-letter weekday label for a Monday-first column index (0 = Mon). */
function wdShort(mondayIdx: number, t: (k: string) => string): string {
  return t(weekdayLabel(mondayIdx === 6 ? 0 : mondayIdx + 1)).slice(0, 2);
}

function title(date: string, state: ActivityState, t: (k: string) => string): string {
  const label = state === "done" ? t("Done") : state === "open" ? t("Not done") : t("Not scheduled");
  return `${fmtShort(date)} · ${label}`;
}

export function ActivityWeek({
  dates,
  states,
  today,
}: {
  dates: string[];
  states: ActivityState[];
  today: string;
}) {
  const t = useT();
  return (
    <div className="flex gap-[5px]">
      {dates.map((d, i) => (
        <div key={d} className="flex flex-1 flex-col items-center gap-1">
          <div
            title={title(d, states[i], t)}
            style={STATE_STYLE[states[i]]}
            className={`h-[18px] w-full rounded-[5px] ${STATE_CLASS[states[i]]} ${
              d === today ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface)]" : ""
            }`}
          />
          <span className="text-[9.5px] font-medium text-[var(--text-faint)]">
            {wdShort(mondayIndex(d), t)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ActivityCalendar({ dates, states, today }: { dates: string[]; states: ActivityState[]; today: string }) {
  const t = useT();
  // Pad the first row so the month starts under the right weekday.
  const lead = dates.length ? mondayIndex(dates[0]) : 0;
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-[5px]">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span key={i} className="text-center text-[9.5px] font-medium text-[var(--text-faint)]">
            {wdShort(i, t)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[5px]">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`pad${i}`} />
        ))}
        {dates.map((d, i) => (
          <div
            key={d}
            title={title(d, states[i], t)}
            style={STATE_STYLE[states[i]]}
            className={`aspect-square rounded-[5px] ${STATE_CLASS[states[i]]} ${
              d === today ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface)]" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function ActivityYear({ dates, states, today }: { dates: string[]; states: ActivityState[]; today: string }) {
  const t = useT();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // A year is wider than a phone. Start at the recent end — that's the part you came for.
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [dates.length]);

  // Columns of seven, aligned so every row is the same weekday.
  const lead = dates.length ? mondayIndex(dates[0]) : 0;
  const cells: ({ date: string; state: ActivityState } | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...dates.map((d, i) => ({ date: d, state: states[i] })),
  ];
  const cols: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));

  return (
    <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex gap-[3px]">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }, (_, ri) => {
              const c = col[ri];
              if (!c) return <span key={ri} className="h-[11px] w-[11px]" />;
              return (
                <div
                  key={ri}
                  title={title(c.date, c.state, t)}
                  style={STATE_STYLE[c.state]}
                  className={`h-[11px] w-[11px] rounded-[3px] ${STATE_CLASS[c.state]} ${
                    c.date === today ? "ring-1 ring-[var(--accent)]" : ""
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Shared legend so the three shades never need explaining twice. */
export function ActivityLegend() {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-[var(--text-faint)]">
      {(["done", "open", "off"] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span style={STATE_STYLE[s]} className={`h-[10px] w-[10px] rounded-[3px] ${STATE_CLASS[s]}`} />
          {s === "done" ? t("Done") : s === "open" ? t("Not done") : t("Not scheduled")}
        </span>
      ))}
    </div>
  );
}
