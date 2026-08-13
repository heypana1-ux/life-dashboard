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
import { Card, PageHeader, SectionTitle, EmptyState, inputCls } from "@/components/ui";

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

  return (
    <div className="space-y-6">
      <PageHeader title={t("Analysis")} subtitle={t("Everything you log, cross-analysed — patterns, connections and suggestions.")} />

      {/* Verdict */}
      <div className="grad relative overflow-hidden rounded-[22px] p-6 text-white shadow-[var(--shadow)]">
        <div className="flex items-center gap-2 text-sm font-medium opacity-85">
          <Brain size={16} /> {t("Overall read")}
        </div>
        <div className="mt-2 flex items-end gap-3">
          <span className="num text-[52px] font-bold leading-none">{verdict.score || "—"}</span>
          <div className="mb-1">
            <div className="text-lg font-semibold">{verdict.label}</div>
            {verdict.trend !== 0 && (
              <div className="flex items-center gap-1 text-sm opacity-90">
                {verdict.trend > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {verdict.trend > 0 ? "+" : ""}
                {verdict.trend} {t("vs last week")}
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 max-w-[640px] text-[15px] leading-[1.55] opacity-95">{verdict.summary}</p>
      </div>

      {hasDrivers && (
        <Card>
          <SectionTitle>{t("What drives your score")}</SectionTitle>
          <p className="mb-3 text-xs text-[var(--text-faint)]">{t("Average Life-Score difference on days with vs. without each factor.")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2.5">
                {items.map((f) => (
                  <FindingRow key={f.id} finding={f} />
                ))}
              </div>
            </Card>
          );
        })
      )}

      <CorrelationExplorer />

      <p className="pb-4 text-center text-xs text-[var(--text-faint)]">
        {t("Observations from your own data — associations, not medical or causal advice.")}
      </p>
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

  const { points, r } = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    if (x && y) {
      for (const h of d.history) {
        const vx = x.get(h.date);
        const vy = y.get(h.date);
        if (vx != null && vy != null) pts.push({ x: vx, y: vy });
      }
    }
    return { points: pts, r: pearson(pts) };
  }, [x, y, d.history]);

  if (metrics.length < 2) return null;

  return (
    <Card>
      <SectionTitle>{t("Correlation explorer")}</SectionTitle>
      <p className="mb-3 text-xs text-[var(--text-muted)]">{t("Pick any two things you track and see how they move together.")}</p>
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
          <Scatter points={points} xLabel={x!.label} yLabel={y!.label} />
          <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-3 text-sm">
            <span className="font-semibold" style={{ color: corrColor(r) }}>
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

function Scatter({ points, xLabel, yLabel }: { points: { x: number; y: number }[]; xLabel: string; yLabel: string }) {
  const W = 300;
  const H = 190;
  const pad = 30;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ys);
  const ymax = Math.max(...ys);
  const nx = (v: number) => (xmax === xmin ? W / 2 : pad + ((v - xmin) / (xmax - xmin)) * (W - pad * 2));
  const ny = (v: number) => (ymax === ymin ? H / 2 : H - pad - ((v - ymin) / (ymax - ymin)) * (H - pad * 2));
  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="max-w-full">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--border)" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--border)" />
        {points.map((p, i) => (
          <circle key={i} cx={nx(p.x)} cy={ny(p.y)} r={3.5} fill="var(--accent)" fillOpacity={0.6} />
        ))}
        <text x={W / 2} y={H - 6} textAnchor="middle" className="fill-[var(--text-faint)]" fontSize="10">{xLabel}</text>
        <text x={10} y={H / 2} textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`} className="fill-[var(--text-faint)]" fontSize="10">{yLabel}</text>
      </svg>
    </div>
  );
}

function DriverList({ title, drivers, positive }: { title: string; drivers: Driver[]; positive: boolean }) {
  const color = positive ? "var(--good)" : "var(--bad)";
  const max = Math.max(1, ...drivers.map((x) => Math.abs(x.delta)));
  if (drivers.length === 0) {
    return (
      <div>
        <div className="mb-2 text-sm font-semibold" style={{ color }}>{title}</div>
        <p className="text-xs text-[var(--text-faint)]">—</p>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2 text-sm font-semibold" style={{ color }}>{title}</div>
      <div className="space-y-1.5">
        {drivers.map((dr, i) => (
          <div key={dr.label} className="flex items-center gap-2">
            <span className="num w-6 text-xs font-bold text-[var(--text-faint)]">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{dr.label}</span>
            <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-[var(--ring-track)] sm:block">
              <div className="h-full rounded-full" style={{ width: `${(Math.abs(dr.delta) / max) * 100}%`, background: color }} />
            </div>
            <span className="num w-9 text-right text-sm font-bold tabular-nums" style={{ color }}>
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
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: style.soft, color: style.color }}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{finding.title}</div>
        <p className="mt-0.5 text-[13.5px] leading-snug text-[var(--text-muted)]">{finding.detail}</p>
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
