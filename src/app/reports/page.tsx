"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, Gift, ImageDown, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT, useLang } from "@/lib/i18n";
import { addDays, fmtShort, isoRange, monthLabel, parseISO, sleepDurationMinutes, todayISO } from "@/lib/date";
import { fmtDuration } from "@/lib/date";
import { fmtMoney } from "@/lib/finance";
import { weekAnchor } from "@/lib/recap";
import { buildInsights } from "@/lib/insights";
import { weeklyNarrative, monthlyNarrative } from "@/lib/narrative";
import { translate } from "@/lib/i18n";
import { downloadReportImage, downloadStateOfYouImage } from "@/lib/reportImage";
import { Language } from "@/lib/types";
import { Card, PageHeader, SectionTitle, Chip, Delta, Badge, Button, FocusZone } from "@/components/ui";
import { RecapOverlay } from "@/components/Recap";
import { YearWrappedOverlay } from "@/components/YearWrapped";
import { availableWrapYears } from "@/lib/yearWrapped";
import { WeeklyReviewFlow } from "@/components/WeeklyReview";
import { CoachInsightCard } from "@/components/Coach";

const RATING_EMOJI = ["😞", "😕", "😐", "🙂", "😄"];

type Period = "week" | "month";

export default function ReportsPage() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const lang = useLang();
  const [period, setPeriod] = useState<Period>("week");
  const [recap, setRecap] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [wrapYear, setWrapYear] = useState<number | null>(null);
  const wrapYears = useMemo(() => availableWrapYears(data, d.history), [data, d.history]);

  const anchor = weekAnchor(todayISO());
  const thisWeekReviewed = data.weeklyReviews.some((r) => r.weekOf === anchor);
  const pastReviews = useMemo(
    () => [...data.weeklyReviews].sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1)),
    [data.weeklyReviews],
  );

  const report = useMemo(() => {
    const today = todayISO();
    let cur: string[];
    let prev: string[];
    let label: string;
    if (period === "week") {
      cur = isoRange(today, 7);
      prev = isoRange(addDays(today, -7), 7);
      label = `${fmtShort(cur[0])} – ${fmtShort(cur[cur.length - 1])}`;
    } else {
      const y = parseISO(today).getFullYear();
      const m = parseISO(today).getMonth();
      cur = daysOfMonth(y, m);
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      prev = daysOfMonth(py, pm);
      label = `${monthLabel(m)} ${y}`;
    }
    return buildReport(data, d, cur, prev, label, lang);
  }, [data, d, period, lang]);

  const insights = useMemo(
    () => buildInsights(data, d.history, lang).slice(0, 3),
    [data, d.history, lang],
  );
  const narrative = useMemo(() => weeklyNarrative(data, d.history, lang), [data, d.history, lang]);
  const monthly = useMemo(() => monthlyNarrative(data, d.history, lang), [data, d.history, lang]);

  function shareState() {
    const now = new Date();
    downloadStateOfYouImage({
      kicker: t("State of You").toUpperCase(),
      month: `${t(monthLabel(now.getMonth()))} ${now.getFullYear()}`,
      text: monthly,
      footer: t("Made with Life Dashboard"),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("Weekly & monthly")}
        title={t("Reports")}
        subtitle={t("Automatic summaries of your week and month.")}
        action={
          <div className="flex items-center gap-2">
            {wrapYears.length > 0 && (
              <Button onClick={() => setWrapYear(wrapYears[0])}>
                <Gift size={16} /> {t("Year in review")}
              </Button>
            )}
            <Button variant="soft" onClick={() => setRecap(true)}>
              <Sparkles size={16} /> {t("Play recap")}
            </Button>
            {report.hasData && (
              <Button variant="soft" onClick={() => shareImage(report, data.finances.currency, t)}>
                <ImageDown size={16} /> {t("Share as image")}
              </Button>
            )}
          </div>
        }
      />

      <div className="flex gap-1.5">
        <Chip active={period === "week"} onClick={() => setPeriod("week")}>
          {t("Weekly")}
        </Chip>
        <Chip active={period === "month"} onClick={() => setPeriod("month")}>
          {t("Monthly")}
        </Chip>
      </div>

      {recap && <RecapOverlay mode={period} refDate={todayISO()} onClose={() => setRecap(false)} />}
      {wrapYear != null && <YearWrappedOverlay year={wrapYear} onClose={() => setWrapYear(null)} />}
      {reviewOpen && <WeeklyReviewFlow anchor={anchor} onClose={() => setReviewOpen(false)} />}

      <Card>
        <SectionTitle
          right={
            period === "month" ? (
              <Button variant="soft" size="sm" onClick={shareState}>
                <ImageDown size={14} /> {t("Share as image")}
              </Button>
            ) : (
              <Badge tone="accent">{t("Auto-written")}</Badge>
            )
          }
        >
          {period === "week" ? t("Your week in words") : t("State of You")}
        </SectionTitle>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          {period === "week" ? narrative : monthly}
        </p>
      </Card>

      <Card>
        <SectionTitle
          right={
            <Button variant="soft" size="sm" onClick={() => setReviewOpen(true)}>
              <CalendarCheck size={14} /> {thisWeekReviewed ? t("Edit review") : t("Start review")}
            </Button>
          }
        >
          {t("Weekly review")}
        </SectionTitle>
        {pastReviews.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            {t("A guided two-minute reflection on your week. Do it any time, or wait for the Sunday nudge.")}
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {pastReviews.slice(0, 8).map((r) => (
              <div key={r.weekOf} className="flex items-start gap-3 py-3">
                <span className="text-2xl leading-none">{RATING_EMOJI[Math.min(4, Math.max(0, r.rating - 1))]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {t("Week of {d}", { d: fmtShort(addDays(r.weekOf, -6)) })}
                  </div>
                  {r.focus && (
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                      <span className="font-medium text-[var(--accent)]">{t("Focus:")}</span> {r.focus}
                    </div>
                  )}
                  {r.wins && <div className="mt-0.5 truncate text-xs text-[var(--text-faint)]">🎉 {r.wins}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {!report.hasData ? (
        <Card>
          <p className="py-12 text-center text-sm text-[var(--text-muted)]">
            {t("Not enough data for this period yet.")}
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <FocusZone
              label={`${t("Life Report")} · ${report.label}`}
              value={report.avgScore}
              sub={report.scoreDelta !== 0 ? <Delta value={report.scoreDelta} /> : undefined}
              progress={report.avgScore}
            />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Metric label={t("Life Rating")} value={report.elo.toLocaleString()} sub={report.eloDelta} />
              <Metric label={t("Training sessions")} value={String(report.workouts)} />
              <Metric label={t("Sleep")} value={report.avgSleep ? fmtDuration(report.avgSleep) : "—"} suffix={t("avg")} />
              <Metric label={t("Journal entries")} value={String(report.journal)} />
              <Metric label={t("Best day")} value={report.bestDay ? String(report.bestScore) : "—"} suffix={report.bestDay ? fmtShort(report.bestDay) : ""} />
              <Metric label={t("Toughest day")} value={report.worstDay ? String(report.worstScore) : "—"} suffix={report.worstDay ? fmtShort(report.worstDay) : ""} />
              {report.netWorthDelta !== null && (
                <Metric label={t("Net worth")} value={report.netWorthDelta >= 0 ? "+" : "−"} money={report.netWorthDelta} currency={data.finances.currency} />
              )}
            </div>
          </Card>

          <CoachInsightCard
            title={t("AI summary")}
            prompt={
              period === "week"
                ? "Give me a short, personal summary of my last 7 days: what stood out, what went well, and one specific thing to improve. 3-4 sentences."
                : "Give me a short, personal summary of my last month: what stood out, what went well, and one specific thing to improve. 3-4 sentences."
            }
          />

          <Card>
            <SectionTitle right={<Badge tone="accent">{t("Data-driven")}</Badge>}>{t("Highlights")}</SectionTitle>
            <div className="space-y-2.5">
              {report.highlights.map((h, i) => (
                <div key={i} className="flex gap-2.5 rounded-xl bg-[var(--surface-2)] p-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--good)]" />
                  <p className="text-sm">{h}</p>
                </div>
              ))}
              {insights.map((ins) => (
                <div key={ins.id} className="flex gap-2.5 rounded-xl bg-[var(--surface-2)] p-3">
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: ins.tone === "good" ? "var(--good)" : ins.tone === "warn" ? "var(--warn)" : "var(--info)" }}
                  />
                  <p className="text-sm">{ins.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function shareImage(
  report: ReportData,
  currency: string,
  t: (k: string, v?: Record<string, string | number>) => string,
) {
  const tiles = [
    { label: t("Life Rating"), value: report.elo.toLocaleString() },
    { label: t("Training sessions"), value: String(report.workouts) },
    { label: t("Sleep"), value: report.avgSleep ? fmtDuration(report.avgSleep) : "—" },
    { label: t("Journal entries"), value: String(report.journal) },
    { label: t("Best day"), value: report.bestDay ? String(report.bestScore) : "—" },
  ];
  if (report.netWorthDelta !== null) {
    tiles.push({
      label: t("Net worth"),
      value: `${report.netWorthDelta >= 0 ? "+" : "−"}${fmtMoney(Math.abs(report.netWorthDelta), currency)}`,
    });
  }
  downloadReportImage({
    title: report.label,
    period: t("Life Report"),
    score: String(report.avgScore),
    scoreDelta: report.scoreDelta === 0 ? "" : `${report.scoreDelta > 0 ? "+" : ""}${report.scoreDelta}`,
    scoreDeltaPositive: report.scoreDelta >= 0,
    tiles,
    highlights: report.highlights,
    footer: "Life Dashboard",
  });
}

function Metric({
  label,
  value,
  sub,
  suffix,
  money,
  currency,
}: {
  label: string;
  value: string;
  sub?: number;
  suffix?: string;
  money?: number;
  currency?: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-2)] p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">{label}</div>
      {money !== undefined ? (
        <div className={`mt-1 text-lg font-bold tabular-nums ${money >= 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
          {money >= 0 ? "+" : "−"}
          {fmtMoney(Math.abs(money), currency)}
        </div>
      ) : (
        <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
      )}
      {sub !== undefined && <Delta value={sub} />}
      {suffix && <div className="text-xs text-[var(--text-faint)]">{suffix}</div>}
    </div>
  );
}

function daysOfMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const last = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= last; i++) {
    days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
  }
  return days;
}

interface ReportData {
  label: string;
  hasData: boolean;
  avgScore: number;
  scoreDelta: number;
  elo: number;
  eloDelta: number;
  workouts: number;
  avgSleep: number;
  journal: number;
  bestDay: string | null;
  bestScore: number;
  worstDay: string | null;
  worstScore: number;
  netWorthDelta: number | null;
  highlights: string[];
}

function buildReport(
  data: AppDataLike,
  d: ReturnType<typeof useDerived>,
  cur: string[],
  prev: string[],
  label: string,
  lang: Language,
): ReportData {
  const tr = (k: string, v?: Record<string, string | number>) => translate(lang, k, v);
  const curScores = cur.map((x) => d.byDate.get(x)).filter((h) => h && h.lifeScore > 0) as { date: string; lifeScore: number; elo: number }[];
  const prevScores = prev.map((x) => d.byDate.get(x)).filter((h) => h && h.lifeScore > 0) as { lifeScore: number }[];

  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const avgScore = avg(curScores.map((h) => h.lifeScore));
  const prevAvg = avg(prevScores.map((h) => h.lifeScore));

  const curSet = new Set(cur);
  const workouts = data.workouts.filter((w) => curSet.has(w.date)).length;
  const sleepDurs = data.sleep.filter((s) => curSet.has(s.date)).map((s) => sleepDurationMinutes(s.bedTime, s.wakeTime, s.fallAsleepMinutes ?? 0));
  const avgSleep = sleepDurs.length ? Math.round(sleepDurs.reduce((a, b) => a + b, 0) / sleepDurs.length) : 0;
  const journal = data.journal.filter((j) => curSet.has(j.date)).length;

  let bestDay: string | null = null;
  let bestScore = 0;
  let worstDay: string | null = null;
  let worstScore = 101;
  for (const h of curScores) {
    if (h.lifeScore > bestScore) { bestScore = h.lifeScore; bestDay = h.date; }
    if (h.lifeScore < worstScore) { worstScore = h.lifeScore; worstDay = h.date; }
  }
  if (worstScore === 101) worstScore = 0;

  const eloEnd = curScores.length ? curScores[curScores.length - 1].elo : d.history.length ? d.history[d.history.length - 1].elo : 1000;
  const eloStart = curScores.length ? curScores[0].elo : eloEnd;
  const eloDelta = eloEnd - eloStart;

  // net worth change over the period
  const nwPoints = data.finances.history.filter((p) => curSet.has(p.date));
  let netWorthDelta: number | null = null;
  if (nwPoints.length >= 1) {
    const before = [...data.finances.history].filter((p) => p.date < cur[0]).pop();
    const first = before ? before.value : nwPoints[0].value;
    const last = nwPoints[nwPoints.length - 1].value;
    netWorthDelta = last - first;
  }

  const highlights: string[] = [];
  if (curScores.length >= 2 && avgScore > prevAvg && prevAvg > 0) {
    highlights.push(tr("Your average Life Score improved {n} points versus the period before.", { n: avgScore - prevAvg }));
  }
  if (workouts >= 3) highlights.push(tr("You trained {n} times — strong consistency.", { n: workouts }));
  if (avgSleep >= 7 * 60 + 30) highlights.push(tr("Your sleep averaged {dur} this period.", { dur: fmtDuration(avgSleep) }));
  if (bestDay) highlights.push(tr("Your best day scored {n}.", { n: bestScore }));
  if (highlights.length === 0 && curScores.length) highlights.push(tr("Logged {n} days this period. Keep the momentum going.", { n: curScores.length }));

  return {
    label,
    hasData: curScores.length > 0,
    avgScore,
    scoreDelta: prevAvg > 0 ? avgScore - prevAvg : 0,
    elo: eloEnd,
    eloDelta,
    workouts,
    avgSleep,
    journal,
    bestDay,
    bestScore,
    worstDay,
    worstScore,
    netWorthDelta,
    highlights,
  };
}

// minimal structural typing to avoid importing the full AppData shape here
type AppDataLike = {
  workouts: { date: string }[];
  sleep: { date: string; bedTime: string; wakeTime: string; fallAsleepMinutes?: number }[];
  journal: { date: string }[];
  finances: { history: { date: string; value: number }[]; currency: string };
};
