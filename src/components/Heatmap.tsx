"use client";

import { HeatCell } from "@/lib/habitStats";
import { parseISO, weekdayOf } from "@/lib/date";

const CELL = 12;
const GAP = 3;

const COLOR: Record<HeatCell["level"], string> = {
  done: "var(--good)",
  missed: "var(--bad-soft)",
  none: "var(--surface-3)",
};

/** GitHub-style contribution grid: columns = weeks, rows = weekdays (Mon–Sun). */
export function Heatmap({ cells }: { cells: HeatCell[] }) {
  if (cells.length === 0) return null;
  const first = cells[0].date;
  const firstRow = (weekdayOf(first) + 6) % 7; // Monday = 0
  const alignedStartMs = parseISO(first).getTime() - firstRow * 86400000;

  const placed = cells.map((c) => {
    const days = Math.round((parseISO(c.date).getTime() - alignedStartMs) / 86400000);
    return { ...c, col: Math.floor(days / 7), row: ((days % 7) + 7) % 7 };
  });
  const maxCol = placed.reduce((m, p) => Math.max(m, p.col), 0);

  const width = (maxCol + 1) * (CELL + GAP);
  const height = 7 * (CELL + GAP);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} role="img">
        {placed.map((c) => (
          <rect
            key={c.date}
            x={c.col * (CELL + GAP)}
            y={c.row * (CELL + GAP)}
            width={CELL}
            height={CELL}
            rx={2.5}
            fill={COLOR[c.level]}
          >
            <title>{c.date}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}
