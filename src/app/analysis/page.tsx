"use client";

import { useMemo } from "react";
import { AlertTriangle, Brain, Lightbulb, Link2, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { analyze, Finding, FindingKind } from "@/lib/analysis";
import { Card, PageHeader, SectionTitle, EmptyState } from "@/components/ui";

export default function AnalysisPage() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const lang = data.settings.language;

  const report = useMemo(() => analyze(data, d.history, lang), [data, d.history, lang]);
  const { verdict, findings } = report;

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

      <p className="pb-4 text-center text-xs text-[var(--text-faint)]">
        {t("Observations from your own data — associations, not medical or causal advice.")}
      </p>
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
