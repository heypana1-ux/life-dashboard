"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Compass, Database, Plus, Save, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { fmtShort, todayISO } from "@/lib/date";
import { WHEEL_DIMS, blankWheelScores, wheelAverage, latestWheel, previousWheel } from "@/lib/wheel";
import { dataWheelScores } from "@/lib/dataWheel";
import { Card, PageHeader, HeaderAction, SectionTitle, Button, ScaleInput, Badge, Chip, EmptyState } from "@/components/ui";
import { RadarChart } from "@/components/charts";
import { CoachInsightCard } from "@/components/Coach";
import { HintCard } from "@/components/HintCard";

type Mode = "feeling" | "data";

export default function WheelPage() {
  const { data, saveWheelCheck, removeWheelCheck } = useStore();
  const d = useDerived();
  const t = useT();
  const today = todayISO();

  const latest = useMemo(() => latestWheel(data.wheelChecks), [data.wheelChecks]);
  const prev = useMemo(() => previousWheel(data.wheelChecks), [data.wheelChecks]);
  const todayCheck = data.wheelChecks.find((w) => w.date === today);
  const dataScores = useMemo(() => dataWheelScores(data, d.history), [data, d.history]);
  const dataDims = WHEEL_DIMS.filter((dm) => dataScores[dm.key] != null);

  const [mode, setMode] = useState<Mode>("feeling");
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

  const dataAvg = dataDims.length ? dataDims.reduce((s, dm) => s + dataScores[dm.key], 0) / dataDims.length : 0;

  // Biggest feeling-vs-data gap, for a targeted coach prompt.
  const gap = useMemo(() => {
    if (!latest) return null;
    let best: { label: string; feel: number; data: number; diff: number } | null = null;
    for (const dm of dataDims) {
      const fv = latest.scores[dm.key];
      const dv = dataScores[dm.key];
      if (fv == null) continue;
      const diff = fv - dv;
      if (!best || Math.abs(diff) > Math.abs(best.diff)) best = { label: dm.label, feel: fv, data: dv, diff };
    }
    return best && Math.abs(best.diff) >= 2 ? best : null;
  }, [latest, dataDims, dataScores]);

  return (
    <div className="space-y-[14px]">
      <PageHeader
        kicker={
          latest
            ? `${t("8 areas")} · ${t("check-in")} ${fmtShort(latest.date)}`
            : t("8 areas")
        }
        lead={t("Wheel of")}
        title={t("Life (wheel)")}
        action={
          latest && !editing ? (
            <HeaderAction
              primary
              label={todayCheck ? t("Update today") : t("New check-in")}
              onClick={() => { setDraft(todayCheck?.scores ?? latest.scores); setEditing(true); }}
            >
              <Plus size={17} strokeWidth={2.4} />
            </HeaderAction>
          ) : undefined
        }
      />

      <HintCard id="wheel" title={t("Feeling vs data")}>
        {t("Rate how your life feels, then switch to \"From your data\" to see the same areas scored from what you've logged — and where gut feeling and numbers differ.")}
      </HintCard>

      <div className="flex gap-1.5">
        <Chip active={mode === "feeling"} onClick={() => setMode("feeling")}>{t("How it feels")}</Chip>
        <Chip active={mode === "data"} onClick={() => setMode("data")}>{t("From your data")}</Chip>
      </div>

      {/* ---- Feeling mode ---- */}
      {mode === "feeling" && (latest ? (
        <div className="grid gap-[14px] lg:grid-cols-[1fr_1fr]">
          <Card>
            <SectionTitle right={<Badge tone="accent">{t("Avg {n}", { n: wheelAverage(latest.scores).toFixed(1) })}</Badge>}>
              {t("Your wheel")}
            </SectionTitle>
            <RadarChart
              labels={false}
              axes={WHEEL_DIMS.map((dm) => t(dm.short))}
              values={WHEEL_DIMS.map((dm) => latest.scores[dm.key] ?? 0)}
              prev={prev ? WHEEL_DIMS.map((dm) => prev.scores[dm.key] ?? 0) : undefined}
            />
            {/* Pulse lists the axis names under the wheel, four per row. */}
            <div className="mt-1.5 grid grid-cols-4 gap-1 text-center">
              {WHEEL_DIMS.map((dm) => (
                <span key={dm.key} className="text-[10px] text-[var(--text-faint)]">{t(dm.short)}</span>
              ))}
            </div>
            {prev && (
              <p className="mt-2.5 text-center text-[10.5px] text-[var(--text-dim)]">
                {t("Dashed = previous check-in ({d})", { d: fmtShort(prev.date) })}
              </p>
            )}
          </Card>

          <Card>
            <SectionTitle>{t("Areas")}</SectionTitle>
            <div className="flex flex-col gap-2.5">
              {WHEEL_DIMS.map((dim) => {
                const v = latest.scores[dim.key] ?? 0;
                const pv = prev?.scores[dim.key];
                const delta = pv != null ? v - pv : 0;
                return (
                  <div key={dim.key} className="flex items-center gap-2.5">
                    <span className="w-[104px] shrink-0 text-[12.5px] leading-tight">{t(dim.label)}</span>
                    <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(v / 10) * 100}%`,
                          background: "linear-gradient(90deg, var(--area-a), var(--area-b))",
                        }}
                      />
                    </div>
                    <span className="num w-3.5 shrink-0 text-right text-[12.5px] font-bold">{v}</span>
                    <span
                      className={clsx(
                        "num w-[22px] shrink-0 text-right text-[11px]",
                        delta > 0 ? "text-[var(--good)]" : delta < 0 ? "text-[var(--bad)]" : "text-[var(--text-dim)]",
                      )}
                    >
                      {delta === 0 ? "·" : delta > 0 ? `+${delta}` : delta}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState icon={<Compass size={26} />} title={t("No wheel yet")} hint={t("Do your first check-in below to see your wheel.")} />
      ))}

      {/* ---- Data mode ---- */}
      {mode === "data" && (dataDims.length >= 3 ? (
        <div className="grid gap-[14px] lg:grid-cols-[1fr_1fr]">
          <Card>
            <SectionTitle right={<Badge tone="accent">{t("Avg {n}", { n: dataAvg.toFixed(1) })}</Badge>}>
              {t("Data wheel")}
            </SectionTitle>
            <RadarChart
              labels={false}
              axes={dataDims.map((dm) => t(dm.short))}
              values={dataDims.map((dm) => dataScores[dm.key])}
              prev={latest ? dataDims.map((dm) => latest.scores[dm.key] ?? 0) : undefined}
            />
            <div className="mt-1.5 grid grid-cols-4 gap-1 text-center">
              {dataDims.map((dm) => (
                <span key={dm.key} className="text-[10px] text-[var(--text-faint)]">{t(dm.short)}</span>
              ))}
            </div>
            <p className="mt-2.5 text-center text-[10.5px] text-[var(--text-dim)]">
              {latest ? t("Solid = from your data · dashed = how you feel") : t("Scored 1–10 from your last 30 days of data.")}
            </p>
          </Card>

          <Card>
            <SectionTitle right={<Database size={15} className="text-[var(--text-faint)]" />}>{t("Feeling vs data")}</SectionTitle>
            <div className="flex flex-col gap-3">
              {dataDims.map((dim) => {
                const dv = dataScores[dim.key];
                const fv = latest?.scores[dim.key];
                const delta = fv != null ? fv - dv : null;
                return (
                  <div key={dim.key}>
                    <div className="mb-[5px] flex items-center justify-between gap-2">
                      <span className="text-[12.5px]">{t(dim.label)}</span>
                      {delta != null ? (
                        <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                          {t("feel")} {fv} · {t("data")} {dv}
                          <span className={clsx("ml-1 font-semibold", delta > 0 ? "text-[var(--warn)]" : delta < 0 ? "area-text" : "text-[var(--text-faint)]")}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{t("data")} {dv}</span>
                      )}
                    </div>
                    {fv != null && (
                      <div className="mb-1 flex items-center gap-[7px]">
                        <span className="w-[26px] shrink-0 text-[9.5px] text-[var(--text-faint)]">{t("feel")}</span>
                        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div className="h-full rounded-full bg-[var(--text-faint)]" style={{ width: `${(fv / 10) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-[7px]">
                      <span className="w-[26px] shrink-0 text-[9.5px] text-[var(--text-faint)]">{t("data")}</span>
                      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(dv / 10) * 100}%`,
                            background: "linear-gradient(90deg, var(--area-a), var(--area-b))",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10.5px] leading-[1.5] text-[var(--text-dim)]">
              {t("Data covers only measurable areas (relationships and home stay feeling-only). A gap isn't wrong — it's worth a look.")}
            </p>
          </Card>
        </div>
      ) : (
        <EmptyState icon={<Database size={26} />} title={t("Data wheel locked")} hint={t("Log a bit more (habits, sleep, training, finances…) to unlock the data wheel.")} />
      ))}

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
                <ScaleInput value={draft[dim.key] ?? 5} onChange={(v) => setDraft((s) => ({ ...s, [dim.key]: v }))} />
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

      {mode === "data" && gap ? (
        <CoachInsightCard
          key="gap"
          title={t("Ask your wheel")}
          prompt={`On my Wheel of Life there is a gap for "${gap.label}": I rate it ${gap.feel}/10 by feeling, but the data-driven score is ${gap.data}/10. In 2-3 sentences, reflect on why my feeling and the data might differ here, and give one small, concrete step. Warm and concise.`}
        />
      ) : (
        (latest || dataDims.length >= 3) && (
          <CoachInsightCard
            key="balance"
            title={t("Coach: your balance")}
            prompt="Look at my Wheel of Life in the snapshot — both my self-rated (feeling) scores and the data-driven scores where available. In 2-3 sentences, note where feeling and data agree, the biggest gap between them, and one small realistic focus. Warm and concise."
          />
        )
      )}

      {history.length > 0 && (
        <Card>
          <SectionTitle right={<Compass size={16} className="text-[var(--text-faint)]" />}>{t("History")}</SectionTitle>
          <div className="divide-y divide-[var(--border)]">
            {history.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2.5 text-[12.5px]">
                <span className="font-medium">{fmtShort(w.date)}</span>
                <div className="flex items-center gap-3">
                  <span className="num text-[var(--text-muted)]">{t("avg")} {wheelAverage(w.scores).toFixed(1)}</span>
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
