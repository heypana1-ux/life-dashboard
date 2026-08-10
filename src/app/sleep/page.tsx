"use client";

import { useMemo, useState } from "react";
import { Moon, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { SleepLog } from "@/lib/types";
import { fmtDuration, sleepDurationMinutes, todayISO } from "@/lib/date";
import {
  Card,
  PageHeader,
  SectionTitle,
  Button,
  ScaleInput,
  Field,
  inputCls,
  Badge,
} from "@/components/ui";
import { TrendLine } from "@/components/charts";

export default function SleepPage() {
  const { data, saveSleep } = useStore();
  const date = todayISO();
  const existing = data.sleep.find((s) => s.date === date);

  const [log, setLog] = useState<SleepLog>(
    existing ?? {
      date,
      bedTime: "23:00",
      wakeTime: "07:00",
      fallAsleepMinutes: 15,
      awakenings: 0,
      quality: 7,
      morningEnergy: 7,
    },
  );
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
      <PageHeader title="Sleep" subtitle="Manual sleep tracking, scores and your personal pattern." />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Log form */}
        <Card className="lg:col-span-1">
          <SectionTitle right={existing ? <Badge tone="good">Logged</Badge> : <Badge>New</Badge>}>
            Last night
          </SectionTitle>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bedtime">
                <input
                  type="time"
                  className={inputCls}
                  value={log.bedTime}
                  onChange={(e) => setLog((l) => ({ ...l, bedTime: e.target.value }))}
                />
              </Field>
              <Field label="Wake time">
                <input
                  type="time"
                  className={inputCls}
                  value={log.wakeTime}
                  onChange={(e) => setLog((l) => ({ ...l, wakeTime: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fall-asleep (min)">
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={log.fallAsleepMinutes ?? 0}
                  onChange={(e) =>
                    setLog((l) => ({ ...l, fallAsleepMinutes: Number(e.target.value) }))
                  }
                />
              </Field>
              <Field label="Awakenings">
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={log.awakenings ?? 0}
                  onChange={(e) => setLog((l) => ({ ...l, awakenings: Number(e.target.value) }))}
                />
              </Field>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium">Quality</span>
                <span className="text-sm font-semibold text-[var(--accent)]">{log.quality}</span>
              </div>
              <ScaleInput value={log.quality} onChange={(v) => setLog((l) => ({ ...l, quality: v }))} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium">Morning energy</span>
                <span className="text-sm font-semibold text-[var(--accent)]">{log.morningEnergy}</span>
              </div>
              <ScaleInput
                value={log.morningEnergy}
                onChange={(v) => setLog((l) => ({ ...l, morningEnergy: v }))}
              />
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] p-3 text-sm">
              Duration:{" "}
              <span className="font-semibold">
                {fmtDuration(sleepDurationMinutes(log.bedTime, log.wakeTime, log.fallAsleepMinutes ?? 0))}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={save}>
                <Save size={16} /> Save
              </Button>
              {flash && <span className="text-sm text-[var(--good)]">Saved ✓</span>}
            </div>
          </div>
        </Card>

        {/* Stats + chart */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Avg duration" value={avgDur ? fmtDuration(avgDur) : "—"} />
            <MiniStat label="Target" value={`${targetH}h`} />
            <MiniStat
              label="Bedtime var."
              value={regularity !== null ? `±${regularity}m` : "—"}
              hint={regularity !== null ? (regularity < 45 ? "regular" : "variable") : undefined}
            />
          </div>

          <Card>
            <SectionTitle>Duration · last 30 nights</SectionTitle>
            {chartData.length >= 2 ? (
              <TrendLine
                data={chartData}
                color="var(--info)"
                unit="h"
                domain={[4, 10]}
                name="Hours"
              />
            ) : (
              <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                Log a few nights to see your trend.
              </p>
            )}
          </Card>

          <Card>
            <SectionTitle right={<Badge tone="accent">From your data</Badge>}>
              Personal pattern
            </SectionTitle>
            {recommendation ? (
              <div className="flex items-start gap-3">
                <Moon className="mt-0.5 text-[var(--accent)]" size={20} />
                <div>
                  <p className="text-sm">
                    Your best-rated mornings follow around{" "}
                    <span className="font-semibold">{fmtDuration(recommendation.minutes)}</span> of
                    sleep (avg morning energy {recommendation.energy.toFixed(1)}/10 in that range).
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-faint)]">
                    A data-based estimate from your own logs — not a medical recommendation.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Not enough data yet for a reliable pattern. Keep logging — an estimate appears after
                ~10 nights.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="!p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      {hint && <div className="text-xs text-[var(--text-muted)]">{hint}</div>}
    </Card>
  );
}
