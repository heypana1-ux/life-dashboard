"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronRight, Target } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { detectAnomalies } from "@/lib/anomalies";
import { Card, SectionTitle, Badge } from "@/components/ui";

/*
  The data-driven cards that used to live on the old, customisable dashboard. The 4a dashboard
  is deliberately a single focused screen, so these moved to the Analysis page's AI tab instead
  of disappearing. They are components (not JSX inlined in a page) so both the AI tab and the
  legacy dashboard can render exactly the same thing.
*/

const ANOMALY_HREF: Record<string, string> = {
  "Life Score": "/statistics",
  Sleep: "/sleep",
  Habits: "/habits",
  Wellbeing: "/health",
  Mood: "/today",
  Training: "/training",
};

function toneColor(tone: "good" | "warn" | "info"): string {
  return tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--info)";
}

/** Metrics that drifted noticeably from your own norm in the last week. */
export function HeadsUpCard() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const anomalies = useMemo(() => detectAnomalies(data, d.history), [data, d.history]);

  return (
    <Card>
      <SectionTitle right={<AlertTriangle size={16} className="text-[var(--warn)]" />}>{t("Heads up")}</SectionTitle>
      {anomalies.length === 0 ? (
        <p className="py-2 text-sm text-[var(--text-muted)]">
          {t("Nothing unusual — your recent numbers are close to your norm.")}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {anomalies.map((a) => (
            <Link
              key={a.id}
              href={ANOMALY_HREF[a.id] ?? "/statistics"}
              className="flex items-center gap-3 rounded-[13px] bg-[var(--surface-2)] p-[13px] transition hover:bg-[var(--surface-3)]"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ background: a.tone === "good" ? "var(--good)" : "var(--warn)" }}
              >
                {a.dir === "up" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">
                  {t(a.metric)}{" "}
                  <span style={{ color: a.tone === "good" ? "var(--good)" : "var(--warn)" }}>
                    {a.dir === "up" ? "▲" : "▼"} {a.pct}%
                  </span>
                </div>
                <div className="text-[12px] text-[var(--text-muted)]">
                  {t("now")} {a.recent} · {t("usual")} {a.usual}
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-[var(--text-faint)]" />
            </Link>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] leading-[1.5] text-[var(--text-faint)]">
        {t("Last 7 days vs the 3 weeks before. Descriptive only — not a medical assessment.")}
      </p>
    </Card>
  );
}

/** Numbered observations derived from your own logs. */
export function InsightsCard() {
  const d = useDerived();
  const t = useT();
  return (
    <Card>
      <SectionTitle right={<Badge tone="accent">{t("Data-driven")}</Badge>}>{t("Insights")}</SectionTitle>
      {d.insights.length === 0 ? (
        <p className="py-2 text-sm text-[var(--text-muted)]">
          {t("Insights appear once there's enough data to spot patterns.")}
        </p>
      ) : (
        <div className="flex flex-col">
          {d.insights.slice(0, 4).map((ins, i) => (
            <div key={ins.id} className="flex gap-3 border-b border-[var(--border)] py-3 last:border-0">
              <span className="num pt-0.5 text-[11px] font-bold tabular-nums" style={{ color: toneColor(ins.tone) }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-[13px] leading-[1.5]">{ins.text}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-[14px] text-[11px] leading-[1.5] text-[var(--text-faint)]">
        {t("Observations from your own logs. These are associations, not medical or causal claims.")}
      </p>
    </Card>
  );
}

/** The intention you set in your latest weekly review. */
export function WeeklyFocusCard() {
  const { data } = useStore();
  const t = useT();
  const focus = useMemo(
    () =>
      [...data.weeklyReviews]
        .filter((r) => r.focus?.trim())
        .sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1))[0] ?? null,
    [data.weeklyReviews],
  );

  return (
    <Link href="/reports" className="block">
      <Card className="flex items-center gap-4 !py-4 transition hover:border-[var(--accent)]">
        <div className="area-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <Target size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            {t("This week's focus")}
          </div>
          {focus ? (
            <div className="mt-0.5 truncate text-sm font-medium">{focus.focus}</div>
          ) : (
            <div className="mt-0.5 text-sm text-[var(--text-muted)]">
              {t("Set an intention in your weekly review.")}
            </div>
          )}
        </div>
        <ChevronRight size={18} className="shrink-0 text-[var(--text-faint)]" />
      </Card>
    </Link>
  );
}
