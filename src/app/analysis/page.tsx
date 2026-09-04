"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Brain, Lightbulb, Link2, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { analyze, Driver, Finding, FindingKind } from "@/lib/analysis";
import { AreaKey } from "@/lib/types";
import { AREA_LABELS } from "@/lib/defaults";
import { sleepDurationMinutes } from "@/lib/date";
import { whatIfSleep, project } from "@/lib/whatif";
import { Card, PageHeader, SectionTitle, EmptyState, Badge, Chip, inputCls } from "@/components/ui";
import { ScatterCorrelation } from "@/components/charts";
import { CoachBriefing, CoachInsightCard, CoachWeeklyCheckin } from "@/components/Coach";
import { HeadsUpCard, InsightsCard, WeeklyFocusCard } from "@/components/AiCards";
import { WeeklyPlanner } from "@/components/WeeklyPlanner";

export default function AnalysisPage() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const lang = data.settings.language;

  const report = useMemo(() => analyze(data, d.history, lang), [data, d.history, lang]);
  const { verdict, findings, drivers } = report;
  const hasDrivers = drivers.positive.length > 0 || drivers.negative.length > 0;

  const groups: { kind: FindingKind; label: string }[] = [
    { kind: "tip", label: t("Recommendations") },
    { kind: "strength", label: t("What's working") },
    { kind: "insight", label: t("Connections") },
    { kind: "watch", label: t("Watch-outs") },
  ];

  const hasFindings = findings.length > 0;

  /* Two halves of the same job. "Patterns" is the statistical read of your logs; "AI analysis"
     is where the coach's own output and the data-driven cards live — the briefing, weekly
     check-in, heads-up and insights that used to sit on the old customisable dashboard. */
  const [tab, setTab] = useState<"patterns" | "ai">("patterns");

  return (
    <div className="space-y-[14px]">
      <PageHeader
        kicker={`${t("Cross-analysed")} · ${t("{n} days", { n: d.history.length })}`}
        lead={t("Your")}
        title={t("Analysis")}
        subtitle={t("Everything you log, cross-analysed — patterns, connections and suggestions.")}
      />

      <div className="flex flex-wrap gap-2">
        <Chip active={tab === "patterns"} onClick={() => setTab("patterns")}>{t("Patterns")}</Chip>
        <Chip active={tab === "ai"} onClick={() => setTab("ai")}>{t("AI analysis")}</Chip>
      </div>

      {tab === "ai" ? (
        <AiTab />
      ) : (
        <>

      {/* Verdict */}
      <div className="area-grad relative overflow-hidden rounded-[22px] p-5 shadow-[0_18px_40px_color-mix(in_srgb,var(--area-a)_32%,transparent)]">
        <div className="flex items-center gap-[7px] text-[12.5px] font-medium opacity-85">
          <Brain size={15} /> {t("Overall read")}
        </div>
        <div className="mt-2 flex items-end gap-3">
          <span className="num text-[48px] font-bold leading-[0.9] tracking-[-0.04em]">{verdict.score || "—"}</span>
          <div className="pb-1">
            <div className="text-[15px] font-semibold">{verdict.label}</div>
            {verdict.trend !== 0 && (
              <div className="flex items-center gap-1 text-[12.5px] opacity-90">
                {verdict.trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {verdict.trend > 0 ? "+" : ""}
                {verdict.trend} {t("vs last week")}
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 max-w-[640px] text-[13px] leading-[1.55] opacity-95">{verdict.summary}</p>
      </div>

      <CoachInsightCard
        title={t("AI interpretation")}
        prompt="Looking at my patterns, score drivers and self-reported goals, what are the 2-3 most useful, specific changes I could make? Keep it concrete and personal to my data."
      />

      {hasDrivers && (
        <Card>
          <SectionTitle>{t("What drives your score")}</SectionTitle>
          <p className="-mt-1.5 mb-3 text-[11px] text-[var(--text-dim)]">{t("Average Life-Score difference on days with vs. without each factor.")}</p>
          <div className="flex flex-col gap-3.5 sm:grid sm:grid-cols-2">
            <DriverList title={t("Lifts your score")} drivers={drivers.positive} positive />
            <DriverList title={t("Weighs it down")} drivers={drivers.negative} positive={false} />
          </div>
        </Card>
      )}

      {!hasFindings ? (
        <EmptyState
          icon={<Sparkles size={26} />}
          title={t("Not enough to analyse yet")}
          hint={t("Keep logging days, sleep and workouts — connections appear after a week or two.")}
        />
      ) : (
        groups.map((g) => {
          const items = findings.filter((f) => f.kind === g.kind);
          if (items.length === 0) return null;
          return (
            <Card key={g.kind}>
              <SectionTitle>{g.label}</SectionTitle>
              <div className="flex flex-col gap-[9px]">
                {items.map((f) => (
                  <FindingRow key={f.id} finding={f} />
                ))}
              </div>
            </Card>
          );
        })
      )}

      <WhatIfCard />

      <CorrelationExplorer />

      <p className="pb-4 text-center text-[10.5px] leading-[1.5] text-[var(--text-dim)]">
        {t("Observations from your own data — associations, not medical or causal advice.")}
      </p>
        </>
      )}
    </div>
  );
}

/** The AI half: the coach's proactive output plus the data-driven cards. */
function AiTab() {
  const { data } = useStore();
  const t = useT();
  const coachOn = !!data.settings.aiCoachEnabled;

  return (
    <div className="space-y-[14px]">
      {coachOn ? (
        <>
          <CoachBriefing />
          <CoachWeeklyCheckin />
        </>
      ) : (
        <Card>
          <SectionTitle>{t("AI coach")}</SectionTitle>
          <p className="text-[13px] leading-[1.5] text-[var(--text-muted)]">
            {t("Turn the AI coach on in Settings to get a daily briefing and a weekly check-in here.")}
          </p>
        </Card>
      )}
      <WeeklyFocusCard />
      <WeeklyPlanner />
      <HeadsUpCard />
      <InsightsCard />
    </div>
  );
}

/* ---------------- Correlation explorer ---------------- */

interface Metric {
  key: string;
  label: string;
  get: (date: string) => number | null;
  unit?: string;
}

function WhatIfCard() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const model = useMemo(() => whatIfSleep(data, d.history), [data, d.history]);
  const [hours, setHours] = useState<number | null>(null);
  if (model.outcomes.length === 0) return null;

  const base = Math.round(model.avgSleepHours * 10) / 10;
  const h = hours ?? base;

  return (
    <Card>
      <SectionTitle right={<Badge tone="accent">{t("Beta")}</Badge>}>{t("What if you slept…")}</SectionTitle>
      <p className="-mt-1.5 mb-3 text-[11px] text-[var(--text-dim)]">
        {t("Drag to see how sleeping more or less has tracked with your outcomes — modelled from your own data.")}
      </p>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{t("Sleep")}</span>
        <span className="num font-semibold text-[var(--accent)]">{h.toFixed(1)} h</span>
      </div>
      <input
        type="range"
        min={4}
        max={10}
        step={0.5}
        value={h}
        onChange={(e) => setHours(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--accent)]"
      />
      <div className="mb-3 mt-1 flex justify-between text-[10px] text-[var(--text-faint)]">
        <span>4h</span>
        <span>{t("your avg {n}h", { n: base.toFixed(1) })}</span>
        <span>10h</span>
      </div>
      <div className="space-y-2">
        {model.outcomes.map((o) => {
          const pred = project(o, model, h);
          const delta = pred - o.baseline;
          const changed = Math.abs(delta) >= Math.pow(10, -o.decimals) / 2;
          return (
            <div key={o.key} className="flex items-center justify-between rounded-[14px] bg-[var(--surface-2)] px-3 py-2.5 text-[12.5px]">
              <span>{t(o.label)}</span>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-[var(--text-faint)]">{o.baseline.toFixed(o.decimals)}</span>
                <span className="text-[var(--text-faint)]">→</span>
                <span className="num font-semibold">{pred.toFixed(o.decimals)}</span>
                {changed && (
                  <span className={delta >= 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}>
                    {delta >= 0 ? "+" : ""}{delta.toFixed(o.decimals)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10.5px] text-[var(--text-dim)]">{t("A rough projection from correlation in your data — not a guarantee.")}</p>
    </Card>
  );
}

function CorrelationExplorer() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();

  const metrics = useMemo<Metric[]>(() => {
    const reviewOf = new Map(data.reviews.map((r) => [r.date, r] as const));
    const sleepOf = new Map(data.sleep.map((s) => [s.date, s] as const));
    const healthOf = new Map(data.health.map((h) => [h.date, h] as const));
    const enabled = new Set(data.settings.areas.filter((a) => a.enabled).map((a) => a.key));
    const list: Metric[] = [
      { key: "life", label: t("Life Score"), get: (d0) => d.byDate.get(d0)?.lifeScore ?? null },
      { key: "productivity", label: t("Productivity"), get: (d0) => reviewOf.get(d0)?.productivity ?? null },
      { key: "mood", label: t("Mood"), get: (d0) => reviewOf.get(d0)?.mood ?? null },
      { key: "energy", label: t("Energy"), get: (d0) => reviewOf.get(d0)?.energy ?? null },
      { key: "satisfaction", label: t("Satisfaction"), get: (d0) => reviewOf.get(d0)?.satisfaction ?? null },
      {
        key: "sleepdur",
        label: t("Sleep (h)"),
        get: (d0) => {
          const s = sleepOf.get(d0);
          return s ? Math.round((sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0) / 60) * 10) / 10 : null;
        },
      },
      { key: "sleepq", label: t("Sleep quality"), get: (d0) => sleepOf.get(d0)?.quality ?? null },
    ];
    if (enabled.has("health")) list.push({ key: "wellbeing", label: t("Wellbeing"), get: (d0) => healthOf.get(d0)?.wellbeing ?? null });
    // Per-area category scores (enabled, habit-driven areas).
    for (const a of ["sport", "habits", "learning", "creativity"] as AreaKey[]) {
      if (enabled.has(a)) list.push({ key: `area-${a}`, label: t(AREA_LABELS[a]), get: (d0) => d.byDate.get(d0)?.categories[a] ?? null });
    }
    // Keep only metrics with enough data.
    return list.filter((m) => d.history.filter((h) => m.get(h.date) != null).length >= 6);
  }, [data, d, t]);

  const [xKey, setXKey] = useState("sleepdur");
  const [yKey, setYKey] = useState("productivity");
  const x = metrics.find((m) => m.key === xKey) ?? metrics[0];
  const y = metrics.find((m) => m.key === yKey) ?? metrics[1] ?? metrics[0];

  const { points, r, line } = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    if (x && y) {
      for (const h of d.history) {
        const vx = x.get(h.date);
        const vy = y.get(h.date);
        if (vx != null && vy != null) pts.push({ x: vx, y: vy });
      }
    }
    return { points: pts, r: pearson(pts), line: regressionLine(pts) };
  }, [x, y, d.history]);

  if (metrics.length < 2) return null;

  return (
    <Card>
      <SectionTitle>{t("Correlation explorer")}</SectionTitle>
      <p className="-mt-1 mb-[11px] text-[11.5px] text-[var(--text-muted)]">{t("Pick any two things you track and see how they move together.")}</p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-[var(--text-faint)]">
          {t("Horizontal")}
          <select className={`${inputCls} mt-1`} value={x?.key} onChange={(e) => setXKey(e.target.value)}>
            {metrics.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--text-faint)]">
          {t("Vertical")}
          <select className={`${inputCls} mt-1`} value={y?.key} onChange={(e) => setYKey(e.target.value)}>
            {metrics.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </label>
      </div>

      {points.length < 6 || r == null ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">{t("Not enough overlapping days for these two yet.")}</p>
      ) : (
        <>
          <ScatterCorrelation points={points} line={line} xLabel={x!.label} yLabel={y!.label} />
          <div className="mt-3 rounded-[16px] bg-[var(--surface-2)] px-3.5 py-[13px] text-[12.5px] leading-[1.5]">
            <span className="font-bold" style={{ color: corrColor(r) }}>
              r = {r.toFixed(2)}
            </span>{" "}
            · {corrText(r, x!.label, y!.label, t)} <span className="text-[var(--text-faint)]">({points.length} {t("days")})</span>
          </div>
        </>
      )}
    </Card>
  );
}

function pearson(pts: { x: number; y: number }[]): number | null {
  const n = pts.length;
  if (n < 6) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my);
    dx += (p.x - mx) ** 2;
    dy += (p.y - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

function corrColor(r: number): string {
  if (Math.abs(r) < 0.2) return "var(--text-muted)";
  return r > 0 ? "var(--good)" : "var(--bad)";
}
function corrText(r: number, a: string, b: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  const strength = Math.abs(r) >= 0.6 ? t("strong") : Math.abs(r) >= 0.35 ? t("moderate") : Math.abs(r) >= 0.2 ? t("weak") : t("little to no");
  if (Math.abs(r) < 0.2) return t("Little to no relationship between {a} and {b}.", { a, b });
  return r > 0
    ? t("{strength} positive link — higher {a} tends to go with higher {b}.", { strength, a, b })
    : t("{strength} inverse link — higher {a} tends to go with lower {b}.", { strength, a, b });
}

/** Least-squares regression line across the x-range, for the scatter trend line. */
function regressionLine(pts: { x: number; y: number }[]): { x1: number; y1: number; x2: number; y2: number } | null {
  const n = pts.length;
  if (n < 6) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of pts) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const xs = pts.map((p) => p.x);
  const x1 = Math.min(...xs);
  const x2 = Math.max(...xs);
  return { x1, y1: slope * x1 + intercept, x2, y2: slope * x2 + intercept };
}

function DriverList({ title, drivers, positive }: { title: string; drivers: Driver[]; positive: boolean }) {
  const color = positive ? "var(--good)" : "var(--bad)";
  const max = Math.max(1, ...drivers.map((x) => Math.abs(x.delta)));
  if (drivers.length === 0) {
    return (
      <div>
        <div className="mb-2 text-[12.5px] font-semibold" style={{ color }}>{title}</div>
        <p className="text-[11px] text-[var(--text-dim)]">—</p>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2 text-[12.5px] font-semibold" style={{ color }}>{title}</div>
      <div className="flex flex-col gap-[7px]">
        {drivers.map((dr, i) => (
          <div key={dr.label} className="flex items-center gap-[9px]">
            <span className="num w-3.5 shrink-0 text-[11px] font-bold text-[var(--text-dim)]">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[12.5px]">{dr.label}</span>
            <span className="h-[5px] w-[54px] shrink-0 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(Math.abs(dr.delta) / max) * 100}%`, background: color }}
              />
            </span>
            <span className="num w-8 shrink-0 text-right text-[12.5px] font-bold" style={{ color }}>
              {dr.delta > 0 ? "+" : ""}{dr.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const style = KIND_STYLE[finding.kind];
  const Icon = style.icon;
  return (
    <div className="flex items-start gap-[11px] rounded-[16px] border border-[var(--border)] px-[13px] py-3">
      <span
        className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: style.soft, color: style.color }}
      >
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold">{finding.title}</div>
        <p className="mt-0.5 text-[12.5px] leading-[1.45] text-[var(--text-faint)]">{finding.detail}</p>
      </div>
    </div>
  );
}

const KIND_STYLE: Record<FindingKind, { icon: typeof Lightbulb; color: string; soft: string }> = {
  tip: { icon: Lightbulb, color: "var(--accent)", soft: "var(--accent-soft)" },
  strength: { icon: TrendingUp, color: "var(--good)", soft: "rgba(22,163,74,.12)" },
  insight: { icon: Link2, color: "var(--info)", soft: "rgba(14,165,233,.12)" },
  watch: { icon: AlertTriangle, color: "var(--warn)", soft: "rgba(217,119,6,.14)" },
};
