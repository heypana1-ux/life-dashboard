"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { activitySources, activityStates } from "@/lib/activity";
import { isoRange, todayISO } from "@/lib/date";
import { Card, SectionTitle, Chip, EmptyState, inputCls } from "@/components/ui";
import { ActivityCalendar, ActivityLegend, ActivityYear } from "@/components/ActivityBoxes";
import { LayoutGrid } from "lucide-react";

/*
  "Did I actually do it?", as boxes. Pick an activity, pick a month or a year, and read the
  answer off the grid without a chart in the way.
*/

export function ActivityCard() {
  const { data } = useStore();
  const t = useT();
  const sources = useMemo(() => activitySources(data), [data]);
  const [source, setSource] = useState<string>("");
  const [range, setRange] = useState<"month" | "year">("month");

  const selected = sources.some((s) => s.id === source) ? source : sources[0]?.id;
  const today = todayISO();
  const dates = useMemo(() => isoRange(today, range === "month" ? 30 : 364), [today, range]);
  const states = useMemo(
    () => (selected ? activityStates(data, selected, dates) : []),
    [data, selected, dates],
  );

  const doneCount = states.filter((s) => s === "done").length;
  const plannedCount = states.filter((s) => s !== "off").length;

  return (
    <Card>
      <SectionTitle right={<LayoutGrid size={16} className="text-[var(--text-faint)]" />}>
        {t("Activity grid")}
      </SectionTitle>

      {!selected ? (
        <EmptyState
          icon={<LayoutGrid size={26} />}
          title={t("Nothing to show yet")}
          hint={t("Add a habit or log a workout — every day you do it fills a box here.")}
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              className={`${inputCls} w-auto min-w-0 flex-1`}
              value={selected}
              onChange={(e) => setSource(e.target.value)}
              aria-label={t("Activity")}
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.translate ? t(s.name) : s.name}
                </option>
              ))}
            </select>
            <div className="flex gap-1.5">
              <Chip active={range === "month"} onClick={() => setRange("month")}>
                {t("1 month")}
              </Chip>
              <Chip active={range === "year"} onClick={() => setRange("year")}>
                {t("1 year")}
              </Chip>
            </div>
          </div>

          {range === "month" ? (
            <ActivityCalendar dates={dates} states={states} today={today} />
          ) : (
            <ActivityYear dates={dates} states={states} today={today} />
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <ActivityLegend />
            <span className="text-[11px] font-medium text-[var(--text-muted)]">
              {t("{done} of {n} days", { done: doneCount, n: plannedCount })}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
