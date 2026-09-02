"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { SleepLog } from "@/lib/types";
import { fmtDuration, sleepDurationMinutes, todayISO } from "@/lib/date";
import { useT } from "@/lib/i18n";
import {
  Card,
  PageHeader,
  SectionTitle,
  Button,
  SegmentScale,
  Field,
  inputCls,
  Badge,
  NumberInput,
} from "@/components/ui";
import { TrendLine } from "@/components/charts";

const blankSleep = (date: string): SleepLog => ({
  date,
  bedTime: "23:00",
  wakeTime: "07:00",
  fallAsleepMinutes: 15,
  awakenings: 0,
  quality: 7,
  morningEnergy: 7,
});

export default function SleepPage() {
  const { data, saveSleep } = useStore();
  const t = useT();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const existing = data.sleep.find((s) => s.date === date);

  const [log, setLog] = useState<SleepLog>(existing ?? blankSleep(date));
  // Load the selected night when the date changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLog(data.sleep.find((s) => s.date === date) ?? blankSleep(date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  const [flash, setFlash] = useState(false);

  // All sleep-derived analytics computed together from a single stable input.
  const stats = useMemo(() => {
    const sorted = [...data.sleep].sort((a, b) => (a.date < b.date ? -1 : 1));
    const durations = sorted.map((s) =>
      sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0),
    );
    const avgDur = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // regularity: stdev of bedtime minutes -> lower is more regular
    let regularity: number | null = null;
    if (sorted.length >= 3) {
      const beds = sorted.map((s) => {
        const [h, m] = s.bedTime.split(":").map(Number);
        return (h < 12 ? h + 24 : h) * 60 + m; // wrap around a common center
      });
      const mean = beds.reduce((a, b) => a + b, 0) / beds.length;
      const variance = beds.reduce((a, b) => a + (b - mean) ** 2, 0) / beds.length;
      regularity = Math.round(Math.sqrt(variance));
    }

    // data-driven recommendation: which duration bucket had the best morning energy
    let recommendation: { minutes: number; energy: number } | null = null;
    if (sorted.length >= 10) {
      const buckets = new Map<number, { sum: number; n: number }>();
      sorted.forEach((s, i) => {
        const bucket = Math.round(durations[i] / 30) * 30;
        const cur = buckets.get(bucket) ?? { sum: 0, n: 0 };
        cur.sum += s.morningEnergy;
        cur.n += 1;
        buckets.set(bucket, cur);
      });
      let best = -1;
      let bestAvg = -1;
      for (const [b, v] of buckets) {
        if (v.n < 2) continue;
        const avg = v.sum / v.n;
        if (avg > bestAvg) {
          bestAvg = avg;
          best = b;
        }
      }
      if (best >= 0) recommendation = { minutes: best, energy: bestAvg };
    }

    const chartData = sorted
      .map((s, i) => ({ date: s.date, value: Math.round((durations[i] / 60) * 10) / 10 }))
      .slice(-30);

    return { avgDur, regularity, recommendation, chartData };
  }, [data.sleep]);

  const { avgDur, regularity, recommendation, chartData } = stats;
  const targetH = Math.round((data.settings.sleepTargetMinutes / 60) * 10) / 10;

  function save() {
    saveSleep({ ...log, date });
    setFlash(true);
    setTimeout(() => setFlash(false), 1800);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`${t("Manual tracking")} · ${data.sleep.length} ${t("nights")}`}
        title={t("Sleep")}
        subtitle={t("Manual sleep tracking, scores and your personal pattern.")}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Log form */}
        <Card className="lg:col-span-1">
          <SectionTitle right={existing ? <Badge tone="good">{t("Logged")}</Badge> : <Badge>{t("New")}</Badge>}>
            {t("Last night")}
          </SectionTitle>
          <div className="space-y-4">
            <Field label={t("Night of")}>
              <input
                type="date"
                max={today}
                className={inputCls}
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Bedtime")}>
                <input
                  type="time"
                  className={inputCls}
                  value={log.bedTime}
                  onChange={(e) => setLog((l) => ({ ...l, bedTime: e.target.value }))}
                />
              </Field>
              <Field label={t("Wake time")}>
                <input
                  type="time"
                  className={inputCls}
                  value={log.wakeTime}
                  onChange={(e) => setLog((l) => ({ ...l, wakeTime: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Fall-asleep (min)")}>
                <NumberInput
                  min={0}
                  value={log.fallAsleepMinutes ?? 0}
                  onChange={(n) => setLog((l) => ({ ...l, fallAsleepMinutes: n ?? 0 }))}
                />
              </Field>
              <Field label={t("Awakenings")}>
                <NumberInput
                  min={0}
                  value={log.awakenings ?? 0}
                  onChange={(n) => setLog((l) => ({ ...l, awakenings: n ?? 0 }))}
                />
              </Field>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium">{t("Quality")}</span>
                <span className="area-text text-sm font-semibold">{log.quality}</span>
              </div>
              <SegmentScale value={log.quality} onChange={(v) => setLog((l) => ({ ...l, quality: v }))} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium">{t("Morning energy")}</span>
                <span className="area-text text-sm font-semibold">{log.morningEnergy}</span>
              </div>
              <SegmentScale
                value={log.morningEnergy}
                onChange={(v) => setLog((l) => ({ ...l, morningEnergy: v }))}
              />
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] p-3 text-sm">
              {t("Duration")}:{" "}
              <span className="font-semibold">
                {fmtDuration(sleepDurationMinutes(log.bedTime, log.wakeTime, log.fallAsleepMinutes ?? 0))}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={save}>
                <Save size={16} /> {t("Save")}
              </Button>
              {flash && <span className="text-sm text-[var(--good)]">{t("Saved ✓")}</span>}
            </div>
          </div>
        </Card>

        {/* Stats + chart */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label={t("Avg duration")} value={avgDur ? fmtDuration(avgDur) : "—"} />
            <MiniStat label={t("Target")} value={`${targetH}h`} />
            <MiniStat
              label={t("Bedtime var.")}
              value={regularity !== null ? `±${regularity}m` : "—"}
              hint={regularity !== null ? (regularity < 45 ? t("regular") : t("variable")) : undefined}
            />
          </div>

          <Card>
            <SectionTitle>{t("Duration · last 30 nights")}</SectionTitle>
            {chartData.length >= 2 ? (
              <TrendLine
                data={chartData}
                color="var(--info)"
                unit="h"
                domain={[4, 10]}
                name={t("hours")}
              />
            ) : (
              <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                {t("Log a few nights to see your trend.")}
              </p>
            )}
          </Card>

          <div className="flex items-start gap-3.5 rounded-[18px] border border-[var(--border)] bg-[var(--accent-soft)] p-5 sm:px-6">
            <Lightbulb className="mt-0.5 shrink-0 text-[var(--accent)]" size={19} />
            <div>
              <p className="mb-1 text-sm font-semibold text-[var(--accent)]">{t("Personal pattern")}</p>
              {recommendation ? (
                <>
                  <p className="text-[13.5px] leading-[1.55]">
                    {t("Your best-rated mornings follow around {dur} of sleep (avg morning energy {energy}/10 in that range).", {
                      dur: fmtDuration(recommendation.minutes),
                      energy: recommendation.energy.toFixed(1),
                    })}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-faint)]">
                    {t("A data-based estimate from your own logs — not a medical recommendation.")}
                  </p>
                </>
              ) : (
                <p className="text-[13.5px] text-[var(--text-muted)]">
                  {t("Not enough data yet for a reliable pattern. Keep logging — an estimate appears after ~10 nights.")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="tile p-4 sm:px-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
        {label}
      </div>
      <div className="num mt-2 text-[22px] font-bold">{value}</div>
      {hint && <div className="text-xs text-[var(--text-muted)]">{hint}</div>}
    </div>
  );
}
