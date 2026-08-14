"use client";

import { useMemo } from "react";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { scoreColor } from "@/lib/score";
import { addDays, fmtShort, weekdayOf } from "@/lib/date";

/*
  A GitHub-style activity heatmap of the last ~10 weeks of Life Score. Sunday-aligned columns,
  coloured by score (empty days stay muted). Gives an at-a-glance sense of momentum.
*/
export function MiniHeatmap({ weeks = 10 }: { weeks?: number }) {
  const d = useDerived();
  const t = useT();

  const cells = useMemo(() => {
    const today = d.today;
    const lead = weekdayOf(today); // days after the last full column (0=Sun)
    const total = weeks * 7;
    const start = addDays(today, -(total - 1 - (6 - lead)));
    const out: { date: string; score: number | null }[] = [];
    for (let i = 0; i < total; i++) {
      const date = addDays(start, i);
      if (date > today) {
        out.push({ date, score: null });
        continue;
      }
      const h = d.byDate.get(date);
      out.push({ date, score: h && h.lifeScore > 0 ? h.lifeScore : 0 });
    }
    return out;
  }, [d, weeks]);

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ width: "max-content" }}>
        {cells.map((c) => (
          <span
            key={c.date}
            title={c.score != null ? `${fmtShort(c.date)}: ${c.score || "—"}` : ""}
            className="h-[13px] w-[13px] rounded-[3px]"
            style={{
              background: c.score == null ? "transparent" : c.score > 0 ? scoreColor(c.score) : "var(--surface-3)",
              opacity: c.score == null ? 0 : c.score > 0 ? 0.35 + Math.min(c.score, 100) / 100 * 0.65 : 1,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--text-faint)]">
        {t("Less")}
        {[15, 40, 65, 90].map((v) => (
          <span key={v} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: scoreColor(v), opacity: 0.35 + v / 100 * 0.65 }} />
        ))}
        {t("More")}
      </div>
    </div>
  );
}
