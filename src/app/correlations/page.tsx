"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { sleepDurationMinutes } from "@/lib/date";
import { Card, PageHeader, SectionTitle, EmptyState, inputCls } from "@/components/ui";
import { ScatterCorrelation } from "@/components/charts";

interface Variable {
  key: string;
  label: string;
  /** date (YYYY-MM-DD) -> value */
  map: Map<string, number>;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

/** Least-squares line endpoints across the x-range, for the scatter overlay. */
function regression(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n < 3) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;
  let num = 0, den = 0;
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = my - slope * mx;
  const xs = pts.map((p) => p.x);
  const x1 = Math.min(...xs);
  const x2 = Math.max(...xs);
  return { x1, y1: slope * x1 + intercept, x2, y2: slope * x2 + intercept };
}

export default function CorrelationsPage() {
  const { data } = useStore();
  const { byDate } = useDerived();
  const t = useT();

  const variables = useMemo<Variable[]>(() => {
    const mk = (key: string, label: string, m: Map<string, number>): Variable => ({ key, label, map: m });
    const reviewMap = (pick: (r: (typeof data.reviews)[number]) => number) =>
      new Map(data.reviews.map((r) => [r.date, pick(r)] as const));

    const life = new Map<string, number>();
    for (const [d, s] of byDate) if (s.lifeScore > 0) life.set(d, s.lifeScore);

    const sleepDur = new Map<string, number>();
    const sleepQ = new Map<string, number>();
    for (const s of data.sleep) {
      sleepDur.set(s.date, Math.round((sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0) / 60) * 10) / 10);
      sleepQ.set(s.date, s.quality);
    }

    const focus = new Map<string, number>();
    for (const f of data.focusSessions ?? []) focus.set(f.date, (focus.get(f.date) ?? 0) + f.minutes);

    const spend = new Map<string, number>();
    for (const tx of data.finances.transactions) if (tx.type === "expense") spend.set(tx.date, (spend.get(tx.date) ?? 0) + tx.amount);

    const workout = new Map<string, number>();
    for (const w of data.workouts) workout.set(w.date, (workout.get(w.date) ?? 0) + w.durationMin);

    const wellbeing = new Map<string, number>();
    for (const h of data.health) if (h.wellbeing != null) wellbeing.set(h.date, h.wellbeing);

    const weight = new Map(data.weight.map((w) => [w.date, w.kg] as const));

    const all: Variable[] = [
      mk("life", t("Life Score"), life),
      mk("mood", t("Mood"), reviewMap((r) => r.mood)),
      mk("energy", t("Energy"), reviewMap((r) => r.energy)),
      mk("productivity", t("Productivity"), reviewMap((r) => r.productivity)),
      mk("satisfaction", t("Satisfaction"), reviewMap((r) => r.satisfaction)),
      mk("discipline", t("Discipline"), reviewMap((r) => r.discipline)),
      mk("sleepDur", t("Sleep hours"), sleepDur),
      mk("sleepQ", t("Sleep quality"), sleepQ),
      mk("focus", t("Focus minutes"), focus),
      mk("spend", t("Daily spending"), spend),
      mk("workout", t("Workout minutes"), workout),
      mk("wellbeing", t("Wellbeing"), wellbeing),
      mk("weight", t("Body weight"), weight),
    ];
    // Only offer variables with at least a few data points.
    return all.filter((v) => v.map.size >= 3);
  }, [data, byDate, t]);

  const [xKey, setXKey] = useState("sleepDur");
  const [yKey, setYKey] = useState("mood");

  // Fall back to whatever is available if the defaults have no data.
  const xVar = variables.find((v) => v.key === xKey) ?? variables[0];
  const yVar = variables.find((v) => v.key === yKey) ?? variables[1] ?? variables[0];

  const { points, r, line } = useMemo(() => {
    if (!xVar || !yVar || xVar.key === yVar.key) return { points: [], r: null as number | null, line: null };
    const pts: { x: number; y: number }[] = [];
    for (const [d, xv] of xVar.map) {
      const yv = yVar.map.get(d);
      if (yv != null) pts.push({ x: xv, y: yv });
    }
    return { points: pts, r: pearson(pts.map((p) => p.x), pts.map((p) => p.y)), line: regression(pts) };
  }, [xVar, yVar]);

  /** Every variable pair with at least 3 shared days, strongest |r| first. */
  const strongestPairs = useMemo(() => {
    const out: { a: string; b: string; r: number }[] = [];
    for (let i = 0; i < variables.length; i++) {
      for (let j = i + 1; j < variables.length; j++) {
        const va = variables[i];
        const vb = variables[j];
        const xs: number[] = [];
        const ys: number[] = [];
        for (const [d, av] of va.map) {
          const bv = vb.map.get(d);
          if (bv != null) {
            xs.push(av);
            ys.push(bv);
          }
        }
        const rr = pearson(xs, ys);
        if (rr != null) out.push({ a: va.label, b: vb.label, r: rr });
      }
    }
    return out.sort((p, q) => Math.abs(q.r) - Math.abs(p.r)).slice(0, 6);
  }, [variables]);

  function swap() {
    setXKey(yVar.key);
    setYKey(xVar.key);
  }

  const strength = (rr: number) => {
    const a = Math.abs(rr);
    if (a >= 0.6) return t("strong");
    if (a >= 0.4) return t("moderate");
    if (a >= 0.2) return t("weak");
    return t("negligible");
  };

  if (variables.length < 2) {
    return (
      <div>
        <PageHeader kicker={t("Two metrics")} title={t("Correlations")} subtitle={t("Explore how any two things you track move together")} />
        <EmptyState icon={<Sparkles size={22} />} title={t("Not enough data yet")} hint={t("Log a couple of weeks across a few areas, then come back to explore the links.")} />
      </div>
    );
  }

  return (
    <div className="space-y-[14px]">
      <PageHeader
        kicker={t("{n} overlapping days", { n: points.length })}
        title={t("Correlations")}
        subtitle={t("Explore how any two things you track move together")}
      />

      <Card>
        {/* X · swap · Y on one row, exactly as the mock lays it out. */}
        <div className="flex items-end gap-[9px]">
          <label className="min-w-0 flex-1">
            <span className="mb-[5px] block text-[11px] font-medium text-[var(--text-muted)]">{t("Horizontal (X)")}</span>
            <select value={xVar?.key} onChange={(e) => setXKey(e.target.value)} className={inputCls}>
              {variables.map((v) => (
                <option key={v.key} value={v.key} disabled={v.key === yVar?.key}>{v.label}</option>
              ))}
            </select>
          </label>
          <button
            onClick={swap}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
            aria-label={t("Swap")}
          >
            <ArrowLeftRight size={16} />
          </button>
          <label className="min-w-0 flex-1">
            <span className="mb-[5px] block text-[11px] font-medium text-[var(--text-muted)]">{t("Vertical (Y)")}</span>
            <select value={yVar?.key} onChange={(e) => setYKey(e.target.value)} className={inputCls}>
              {variables.map((v) => (
                <option key={v.key} value={v.key} disabled={v.key === xVar?.key}>{v.label}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card>
        <SectionTitle
          right={
            r != null ? (
              <span className="area-text text-[11.5px] font-semibold">r = {r.toFixed(2)}</span>
            ) : undefined
          }
        >
          {xVar?.label} ↔ {yVar?.label}
        </SectionTitle>
        {points.length < 3 ? (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">
            {t("Only {n} overlapping days so far — log more to see a pattern.", { n: points.length })}
          </p>
        ) : (
          <>
            <ScatterCorrelation points={points} line={line} xLabel={xVar?.label ?? ""} yLabel={yVar?.label ?? ""} />
            <div className="mt-3 rounded-[16px] bg-[var(--surface-2)] px-3.5 py-[13px] text-[12.5px]">
              {r == null ? (
                <span className="text-[var(--text-muted)]">{t("No clear relationship in this pair.")}</span>
              ) : (
                <>
                  <span className="font-bold">r = {r.toFixed(2)}</span>{" "}
                  <span className="text-[var(--text-muted)]">
                    ({strength(r)} {r > 0 ? t("positive") : t("negative")}, {t("{n} days", { n: points.length })})
                  </span>
                  <p className="mt-1.5 leading-[1.5] text-[var(--text-muted)]">
                    {Math.abs(r) < 0.2
                      ? t("These two barely move together in your data.")
                      : r > 0
                        ? t("When {x} is higher, {y} tends to be higher too.", { x: xVar!.label, y: yVar!.label })
                        : t("When {x} is higher, {y} tends to be lower.", { x: xVar!.label, y: yVar!.label })}
                    {" "}
                    <span className="text-[var(--text-dim)]">{t("Correlation, not causation.")}</span>
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </Card>

      {strongestPairs.length > 0 && (
        <Card>
          <SectionTitle>{t("Strongest pairs in your data")}</SectionTitle>
          <div className="flex flex-col">
            {strongestPairs.map((p) => (
              <div
                key={`${p.a}-${p.b}`}
                className="flex items-center gap-2.5 border-b border-[var(--border)] py-[11px] last:border-0"
              >
                <div className="min-w-0 flex-1 text-[12.5px]">
                  {p.a} <span className="text-[var(--text-dim)]">↔</span> {p.b}
                </div>
                <span
                  className="num text-[12.5px] font-bold"
                  style={{ color: p.r >= 0 ? "var(--good)" : "var(--bad)" }}
                >
                  {p.r >= 0 ? p.r.toFixed(2) : `−${Math.abs(p.r).toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-[11px] text-[10.5px] leading-[1.5] text-[var(--text-dim)]">
            {t("Pearson r over days where both values exist. Pairs with fewer than 3 shared days are hidden.")}
          </p>
        </Card>
      )}
    </div>
  );
}
