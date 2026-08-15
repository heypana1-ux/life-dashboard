"use client";

import { useMemo, useState } from "react";
import { Compass, Database, Save, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { fmtShort, todayISO } from "@/lib/date";
import { WHEEL_DIMS, blankWheelScores, wheelAverage, latestWheel, previousWheel } from "@/lib/wheel";
import { dataWheelScores } from "@/lib/dataWheel";
import { Card, PageHeader, SectionTitle, Button, ScaleInput, Badge, Chip } from "@/components/ui";
import { RadarChart } from "@/components/charts";
import { CoachInsightCard } from "@/components/Coach";

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

      <div className="flex gap-1.5">
        <Chip active={mode === "feeling"} onClick={() => setMode("feeling")}>{t("How it feels")}</Chip>
        <Chip active={mode === "data"} onClick={() => setMode("data")}>{t("From your data")}</Chip>
      </div>

      {/* ---- Feeling mode ---- */}
      {mode === "feeling" && (latest ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="flex flex-col items-center">
            <SectionTitle right={<Badge tone="accent">{t("Avg {n}", { n: wheelAverage(latest.scores).toFixed(1) })}</Badge>}>
              {t("Your wheel")}
            </SectionTitle>
            <RadarChart
              axes={WHEEL_DIMS.map((dm) => t(dm.short))}
              values={WHEEL_DIMS.map((dm) => latest.scores[dm.key] ?? 0)}
              prev={prev ? WHEEL_DIMS.map((dm) => prev.scores[dm.key] ?? 0) : undefined}
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
      ) : (
        <Card>
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">{t("Do your first check-in below to see your wheel.")}</p>
        </Card>
      ))}

      {/* ---- Data mode ---- */}
      {mode === "data" && (dataDims.length >= 3 ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="flex flex-col items-center">
            <SectionTitle right={<Badge tone="accent">{t("Avg {n}", { n: dataAvg.toFixed(1) })}</Badge>}>
              {t("Data wheel")}
            </SectionTitle>
            <RadarChart
              axes={dataDims.map((dm) => t(dm.short))}
              values={dataDims.map((dm) => dataScores[dm.key])}
              prev={latest ? dataDims.map((dm) => latest.scores[dm.key] ?? 0) : undefined}
            />
            <p className="mt-1 text-[11px] text-[var(--text-faint)]">
              {latest ? t("Solid = from your data · dashed = how you feel") : t("Scored 1–10 from your last 30 days of data.")}
            </p>
          </Card>

          <Card>
            <SectionTitle right={<Database size={16} className="text-[var(--text-faint)]" />}>{t("Feeling vs data")}</SectionTitle>
            <div className="space-y-3">
              {dataDims.map((dim) => {
                const dv = dataScores[dim.key];
                const fv = latest?.scores[dim.key];
                const delta = fv != null ? fv - dv : null;
                return (
                  <div key={dim.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{t(dim.label)}</span>
                      {delta != null ? (
                        <span className="text-xs text-[var(--text-muted)]">
                          {t("feel")} {fv} · {t("data")} {dv}
                          <span className={`ml-1.5 font-medium ${delta > 0 ? "text-[var(--warn)]" : delta < 0 ? "text-[var(--info)]" : "text-[var(--text-faint)]"}`}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">{t("data")} {dv}</span>
                      )}
                    </div>
                    {fv != null && (
                      <div className="mb-1 flex items-center gap-2">
                        <span className="w-9 shrink-0 text-[10px] text-[var(--text-faint)]">{t("feel")}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ring-track)]">
                          <div className="h-full rounded-full bg-[var(--text-faint)]" style={{ width: `${(fv / 10) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="w-9 shrink-0 text-[10px] text-[var(--text-faint)]">{t("data")}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ring-track)]">
                        <div className="grad h-full rounded-full" style={{ width: `${(dv / 10) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] leading-[1.5] text-[var(--text-faint)]">
              {t("Data covers only measurable areas (relationships and home stay feeling-only). A gap isn't wrong — it's worth a look.")}
            </p>
          </Card>
        </div>
      ) : (
        <Card>
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">
            {t("Log a bit more (habits, sleep, training, finances…) to unlock the data wheel.")}
          </p>
        </Card>
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

      {(latest || dataDims.length >= 3) && (
        <CoachInsightCard
          title={t("Coach: your balance")}
          prompt="Look at my Wheel of Life in the snapshot — both my self-rated (feeling) scores and the data-driven scores where available. In 2-3 sentences, note where feeling and data agree, the biggest gap between them, and one small realistic focus. Warm and concise."
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
