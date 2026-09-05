"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import clsx from "clsx";
import { AREA_LABELS } from "@/lib/defaults";
import { AreaKey } from "@/lib/types";
import { AREA_COLORS, AREA_ICONS } from "@/lib/areaStyle";
import { weekdayLabel, fmtShort } from "@/lib/date";
import { useT } from "@/lib/i18n";
import { Card, PageHeader, SectionTitle, Chip, Badge, Delta } from "@/components/ui";
import { bestSelf } from "@/lib/bestSelf";
import { TrendLine, MultiLine, MiniSpark } from "@/components/charts";
import { ActivityCard } from "@/components/ActivityCard";

const RANGES: { key: string; days: number; label: string }[] = [
  { key: "7", days: 7, label: "7D" },
  { key: "30", days: 30, label: "30D" },
  { key: "90", days: 90, label: "3M" },
  { key: "180", days: 180, label: "6M" },
  { key: "365", days: 365, label: "1Y" },
  { key: "all", days: 100000, label: "All" },
];

export default function StatisticsPage() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const [range, setRange] = useState("30");
  const [metric, setMetric] = useState<"life" | "elo" | "categories">("life");
  const [soloCat, setSoloCat] = useState<string | null>(null);

  const days = RANGES.find((r) => r.key === range)!.days;
  const scoped = useMemo(() => {
    const withData = d.history.filter((h) => h.lifeScore > 0);
    return withData.slice(Math.max(0, withData.length - days));
  }, [d.history, days]);

  const enabledCats = data.settings.areas
    .filter((a) => a.enabled && a.key !== "finances")
    .map((a) => a.key);

  const lifeSeries = scoped.map((h) => ({ date: h.date, value: h.lifeScore }));
  const eloSeries = scoped.map((h) => ({ date: h.date, value: h.elo }));
  const catSeries = scoped.map((h) => {
    const row: Record<string, number | string> = { date: h.date };
    enabledCats.forEach((c) => (row[c] = h.categories[c] ?? 0));
    return row;
  });

  // ELO summary
  const elo = d.history.length ? d.history[d.history.length - 1].elo : data.settings.eloStart;
  const eloBest = d.history.reduce((m, h) => Math.max(m, h.elo), data.settings.eloStart);
  const eloAt = (backDays: number) => {
    const withData = d.history.filter((h) => h.lifeScore > 0);
    if (withData.length === 0) return data.settings.eloStart;
    const idx = Math.max(0, withData.length - 1 - backDays);
    return withData[idx].elo;
  };

  // weekday averages (life score)
  const byWd = Array.from({ length: 7 }, () => [] as number[]);
  d.history.filter((h) => h.lifeScore > 0).forEach((h) => byWd[new Date(h.date).getDay()].push(h.lifeScore));
  const wdData = [1, 2, 3, 4, 5, 6, 0].map((wd) => ({
    label: t(weekdayLabel(wd)),
    value: byWd[wd].length ? Math.round(byWd[wd].reduce((a, b) => a + b, 0) / byWd[wd].length) : 0,
  }));

  const lifeMean = scoped.length
    ? Math.round(scoped.reduce((a, b) => a + b.lifeScore, 0) / scoped.length)
    : 0;

  // Mood & energy from check-ins within the selected range.
  const moodEnergy = useMemo(() => {
    const start = scoped.length ? scoped[0].date : "9999";
    return data.reviews
      .filter((r) => r.date >= start)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((r) => ({ date: r.date, mood: r.mood, energy: r.energy }));
  }, [data.reviews, scoped]);
  const meAvg = (k: "mood" | "energy") =>
    moodEnergy.length ? Math.round((moodEnergy.reduce((a, r) => a + r[k], 0) / moodEnergy.length) * 10) / 10 : 0;

  return (
    <div className="space-y-[14px]">
      <PageHeader kicker={t("Trends · 30 days")} lead={t("Your")} title={t("Statistics")} subtitle={t("Trends, ratings and correlations from your data.")} />

      <BestSelfCard />

      <ActivityCard />

      {/* Range selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <Chip key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>
              {r.key === "all" ? t("All") : r.label}
            </Chip>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Chip active={metric === "life"} onClick={() => setMetric("life")}>
            {t("Life Score")}
          </Chip>
          <Chip active={metric === "elo"} onClick={() => setMetric("elo")}>
            ELO
          </Chip>
          <Chip active={metric === "categories"} onClick={() => setMetric("categories")}>
            {t("Categories")}
          </Chip>
        </div>
      </div>

      {/* Main chart */}
      <Card>
        <SectionTitle
          right={
            metric === "life" ? (
              <span className="text-xs text-[var(--text-muted)]">{t("avg")} {lifeMean}</span>
            ) : undefined
          }
        >
          {metric === "life" ? t("Life Score") : metric === "elo" ? t("Life Rating (ELO)") : t("Categories")}
        </SectionTitle>
        {scoped.length < 2 ? (
          <p className="py-16 text-center text-sm text-[var(--text-muted)]">
            {t("Not enough data in this range yet.")}
          </p>
        ) : metric === "life" ? (
          <TrendLine data={lifeSeries} color="var(--accent)" domain={[0, 100]} name={t("Life Score")} height={150} />
        ) : metric === "elo" ? (
          <TrendLine data={eloSeries} color="#d97706" name="ELO" height={150} />
        ) : (
          <>
            {/* Eight lines in one box is a hairball — you can't follow any single one, and the
                colours stop meaning anything. So: one category at a time gets the full chart,
                and the rest become a grid of small multiples. Same data, same colours, but each
                trend is readable on its own and you still see them side by side. Tapping a tile
                promotes it to the big chart. */}
            {soloCat ? (
              <>
                <MultiLine
                  data={catSeries}
                  domain={[0, 100]}
                  height={150}
                  series={[
                    { key: soloCat, name: t(AREA_LABELS[soloCat as AreaKey]), color: AREA_COLORS[soloCat as AreaKey] ?? "var(--accent)" },
                  ]}
                />
                <p className="mt-2 text-xs text-[var(--text-faint)]">
                  {t("Showing one category — tap it again to show all.")}
                </p>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {enabledCats.map((c) => {
                  const series = catSeries.map((r) => ({ date: r.date as string, value: Number(r[c] ?? 0) }));
                  const last = series.length ? series[series.length - 1].value : 0;
                  const first = series.length ? series[0].value : 0;
                  const Icon = AREA_ICONS[c];
                  return (
                    <button
                      key={c}
                      onClick={() => setSoloCat(c)}
                      className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-left transition hover:border-[var(--accent)]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                          {Icon && <Icon size={12} style={{ color: AREA_COLORS[c] }} />}
                          <span className="truncate">{t(AREA_LABELS[c])}</span>
                        </span>
                        <span className="num text-[13px] font-bold" style={{ color: AREA_COLORS[c] }}>
                          {Math.round(last)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <MiniSpark data={series} color={AREA_COLORS[c] ?? "var(--accent)"} height={34} />
                      </div>
                      <Delta value={Math.round(last - first)} className="mt-1" />
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {enabledCats.map((c) => {
                const active = soloCat === null || soloCat === c;
                const Icon = AREA_ICONS[c];
                return (
                  <button
                    key={c}
                    onClick={() => setSoloCat((s) => (s === c ? null : c))}
                    className={clsx(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                      soloCat === c
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]",
                      active ? "" : "opacity-45",
                    )}
                  >
                    {Icon ? <Icon size={12} style={{ color: AREA_COLORS[c] }} /> : <span className="h-2.5 w-2.5 rounded-full" style={{ background: AREA_COLORS[c] }} />}
                    {t(AREA_LABELS[c])}
                  </button>
                );
              })}
            </div>
            {false && (
              <p className="mt-2 text-xs text-[var(--text-faint)]">{t("Showing one category — tap it again to show all.")}</p>
            )}
          </>
        )}
      </Card>

      {/* ELO summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <EloStat label={t("Current")} value={elo.toLocaleString()} />
        <EloStat label={t("Personal best")} value={eloBest.toLocaleString()} />
        <EloStat label={t("30-day")} delta={elo - eloAt(30)} />
        <EloStat label={t("90-day")} delta={elo - eloAt(90)} />
        <EloStat label={t("All-time")} delta={elo - data.settings.eloStart} />
      </div>

      {/* Mood & energy trend */}
      {moodEnergy.length >= 3 && (
        <Card>
          <SectionTitle
            right={
              <span className="flex gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--accent)]" />{t("Mood")} {meAvg("mood")}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--good)]" />{t("Energy")} {meAvg("energy")}</span>
              </span>
            }
          >
            {t("Mood & energy")}
          </SectionTitle>
          <MultiLine
            data={moodEnergy}
            domain={[0, 10]}
            height={150}
            series={[
              { key: "mood", name: t("Mood"), color: "var(--accent)" },
              { key: "energy", name: t("Energy"), color: "var(--good)" },
            ]}
          />
          <p className="mt-2 text-[11px] text-[var(--text-faint)]">
            {t("From your daily check-ins (1-10), over the selected range.")}
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weekday pattern */}
        <Card>
          <SectionTitle>{t("Life Score by weekday")}</SectionTitle>
          <div className="flex items-end gap-1.5" style={{ height: 78 }}>
            {(() => {
              const max = Math.max(1, ...wdData.map((x) => x.value));
              return wdData.map((d0) => {
                const h = d0.value > 0 ? Math.max(6, (d0.value / max) * 40) : 3;
                return (
                  <div key={d0.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="num text-[10px] tabular-nums text-[var(--text-faint)]">{d0.value || "—"}</span>
                    <span
                      className="w-full"
                      style={{
                        height: h,
                        borderRadius: "7px 7px 3px 3px",
                        background: "linear-gradient(180deg, var(--area-a), color-mix(in srgb, var(--area-a) 35%, transparent))",
                      }}
                    />
                    <span className="text-[10px] text-[var(--text-faint)]">{d0.label}</span>
                  </div>
                );
              });
            })()}
          </div>
        </Card>

        {/* Correlations / insights */}
        <Card>
          <SectionTitle right={<Badge tone="accent">{t("Correlations")}</Badge>}>{t("What your data suggests")}</SectionTitle>
          <div className="space-y-2.5">
            {d.insights.map((ins) => (
              <div key={ins.id} className="flex gap-2.5 rounded-xl bg-[var(--surface-2)] p-3">
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background:
                      ins.tone === "good"
                        ? "var(--good)"
                        : ins.tone === "warn"
                          ? "var(--warn)"
                          : "var(--info)",
                  }}
                />
                <p className="text-sm">{ins.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[var(--text-faint)]">
            {t("Associations observed in your logs — correlation, not causation.")}
          </p>
        </Card>
      </div>
    </div>
  );
}

function BestSelfCard() {
  const d = useDerived();
  const t = useT();
  const bs = useMemo(() => bestSelf(d.history), [d.history]);
  if (!bs.enough) return null;

  const atPeak = bs.diff >= 0;
  const pct = bs.best > 0 ? Math.min(100, Math.round((bs.current / bs.best) * 100)) : 0;
  return (
    <Card>
      <SectionTitle right={<Badge tone={atPeak ? "good" : "accent"}>{atPeak ? t("At your best 🎉") : t("{n} to go", { n: Math.abs(bs.diff) })}</Badge>}>
        {t("Your best self")}
      </SectionTitle>
      <div className="flex items-end gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-faint)]">{t("Now (30-day avg)")}</div>
          <div className="num text-3xl font-bold">{bs.current}</div>
        </div>
        <div className="pb-1 text-[var(--text-faint)]">vs</div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-faint)]">{t("Your best ever")}</div>
          <div className="num text-3xl font-bold text-[var(--accent)]">{bs.best}</div>
          {bs.bestEndDate && <div className="text-[11px] text-[var(--text-faint)]">{t("ended {d}", { d: fmtShort(bs.bestEndDate) })}</div>}
        </div>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--ring-track)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,var(--area-a),var(--area-b))" }} />
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-faint)]">
        {atPeak ? t("You're matching or beating your best 30-day stretch. Keep it up.") : t("Compared with your own peak — not anyone else's.")}
      </p>
    </Card>
  );
}

function EloStat({ label, value, delta }: { label: string; value?: string; delta?: number }) {
  return (
    <Card className="!p-[13px]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">{label}</div>
      {value !== undefined ? (
        <div className="num mt-1 text-[20px] font-bold tracking-[-0.03em] tabular-nums">{value}</div>
      ) : (
        <div className="num mt-1 text-[20px] font-bold tracking-[-0.03em] tabular-nums" style={{ color: (delta ?? 0) >= 0 ? "var(--good)" : "var(--bad)" }}>
          {(delta ?? 0) >= 0 ? "+" : ""}{delta ?? 0}
        </div>
      )}
    </Card>
  );
}
