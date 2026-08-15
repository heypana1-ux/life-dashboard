"use client";

import { useMemo, useState } from "react";
import { Compass, Save, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtShort, todayISO } from "@/lib/date";
import { WHEEL_DIMS, blankWheelScores, wheelAverage, latestWheel, previousWheel } from "@/lib/wheel";
import { Card, PageHeader, SectionTitle, Button, ScaleInput, Badge } from "@/components/ui";
import { RadarChart } from "@/components/charts";
import { CoachInsightCard } from "@/components/Coach";

export default function WheelPage() {
  const { data, saveWheelCheck, removeWheelCheck } = useStore();
  const t = useT();
  const today = todayISO();

  const latest = useMemo(() => latestWheel(data.wheelChecks), [data.wheelChecks]);
  const prev = useMemo(() => previousWheel(data.wheelChecks), [data.wheelChecks]);
  const todayCheck = data.wheelChecks.find((w) => w.date === today);

  const [draft, setDraft] = useState<Record<string, number>>(
    todayCheck?.scores ?? latest?.scores ?? blankWheelScores(),
  );
  const [editing, setEditing] = useState(!latest);
  const [flash, setFlash] = useState(false);

  function save() {
    saveWheelCheck({ id: todayCheck?.id ?? "", date: today, scores: { ...draft } });
    setEditing(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 1600);
  }

  const history = useMemo(
    () => [...data.wheelChecks].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.wheelChecks],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Wheel of Life")}
        subtitle={t("Rate 8 areas of your life 1–10 to see your balance and how it shifts over time.")}
        action={
          latest && !editing ? (
            <Button variant="soft" onClick={() => { setDraft(todayCheck?.scores ?? latest.scores); setEditing(true); }}>
              {todayCheck ? t("Update today") : t("New check-in")}
            </Button>
          ) : undefined
        }
      />

      {latest && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="flex flex-col items-center">
            <SectionTitle right={<Badge tone="accent">{t("Avg {n}", { n: wheelAverage(latest.scores).toFixed(1) })}</Badge>}>
              {t("Your wheel")}
            </SectionTitle>
            <RadarChart
              axes={WHEEL_DIMS.map((d) => t(d.short))}
              values={WHEEL_DIMS.map((d) => latest.scores[d.key] ?? 0)}
              prev={prev ? WHEEL_DIMS.map((d) => prev.scores[d.key] ?? 0) : undefined}
            />
            {prev && (
              <p className="mt-1 text-[11px] text-[var(--text-faint)]">
                {t("Dashed = previous check-in ({d})", { d: fmtShort(prev.date) })}
              </p>
            )}
          </Card>

          <Card>
            <SectionTitle>{t("Areas")}</SectionTitle>
            <div className="space-y-2.5">
              {WHEEL_DIMS.map((dim) => {
                const v = latest.scores[dim.key] ?? 0;
                const pv = prev?.scores[dim.key];
                const delta = pv != null ? v - pv : 0;
                return (
                  <div key={dim.key} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm">{t(dim.label)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--ring-track)]">
                      <div className="grad h-full rounded-full" style={{ width: `${(v / 10) * 100}%` }} />
                    </div>
                    <span className="num w-6 text-right text-sm font-semibold">{v}</span>
                    {delta !== 0 && (
                      <span className={`w-8 text-right text-xs tabular-nums ${delta > 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
                        {delta > 0 ? "+" : ""}{delta}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {editing && (
        <Card>
          <SectionTitle right={flash ? <span className="text-sm text-[var(--good)]">{t("Saved ✓")}</span> : undefined}>
            {todayCheck ? t("Update today's check-in") : t("New check-in")}
          </SectionTitle>
          <p className="mb-4 text-xs text-[var(--text-muted)]">{t("Be honest — this is a private snapshot, not a test.")}</p>
          <div className="space-y-4">
            {WHEEL_DIMS.map((dim) => (
              <div key={dim.key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">{t(dim.label)}</span>
                  <span className="text-sm font-semibold text-[var(--accent)]">{draft[dim.key] ?? 5}/10</span>
                </div>
                <ScaleInput value={draft[dim.key] ?? 5} onChange={(v) => setDraft((d) => ({ ...d, [dim.key]: v }))} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button onClick={save}>
              <Save size={16} /> {t("Save check-in")}
            </Button>
            {latest && (
              <Button variant="ghost" onClick={() => setEditing(false)}>{t("Cancel")}</Button>
            )}
          </div>
        </Card>
      )}

      {latest && (
        <CoachInsightCard
          title={t("Coach: your balance")}
          prompt="Look at my latest Wheel of Life self-assessment in the snapshot. In 2-3 sentences, note which areas are strongest and which are lowest, and suggest one small, realistic focus for the lowest area. Warm and concise."
        />
      )}

      {history.length > 0 && (
        <Card>
          <SectionTitle right={<Compass size={16} className="text-[var(--text-faint)]" />}>{t("History")}</SectionTitle>
          <div className="divide-y divide-[var(--border)]">
            {history.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium">{fmtShort(w.date)}</span>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-[var(--text-muted)]">{t("avg")} {wheelAverage(w.scores).toFixed(1)}</span>
                  <button onClick={() => removeWheelCheck(w.id)} className="text-[var(--text-faint)] hover:text-[var(--bad)]" aria-label={t("Delete")}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
