/*
  The previous ("Pulse 2a") dashboard, kept verbatim so we can bring parts of it back.
  `_legacy` is a Next.js private folder — nothing in here is routed. To restore it, either
  render <DashboardClassic /> from src/app/page.tsx or move this file back to src/app/page.tsx.
*/
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived, useTodayComputation } from "@/lib/useDerived";
import { AREA_LABELS } from "@/lib/defaults";
import { habitsForToday } from "@/lib/habitView";
import { dayHasEntry } from "@/lib/dayActivity";
import { areaColor, AREA_ICONS } from "@/lib/areaStyle";
import { computeLevel } from "@/lib/level";
import { weeklyChallenges } from "@/lib/challenges";
import { detectAnomalies } from "@/lib/anomalies";
import { earlyWarning, predictTomorrow } from "@/lib/forecast";
import { fmtLong } from "@/lib/date";
import { scoreLabel, scoreColor } from "@/lib/score";
import { AreaKey } from "@/lib/types";
import { effectiveLayout, CARD_LABELS as SHARED_CARD_LABELS, type DashboardCardId } from "@/lib/dashboardCards";
import { useT } from "@/lib/i18n";
import { Card, PageHeader, SectionTitle, Delta, Badge, Button, EmptyState, AnimatedNumber, IconTile } from "@/components/ui";
import { HabitRow } from "@/components/HabitRow";
import { CoachBriefing, CoachWeeklyCheckin } from "@/components/Coach";
import { WeeklyPlanner } from "@/components/WeeklyPlanner";
import { MiniHeatmap } from "@/components/MiniHeatmap";
import { HintCard } from "@/components/HintCard";

/** Dashboard blocks the user can reorder / hide. The score hero and the streak nudge stay pinned.
 *  Card ids, default layout and the legacy migration live in dashboardCards.ts (shared with the
 *  AI quick-capture tool). */
type CardId = DashboardCardId;

/** Where each anomaly links to when tapped. */
const ANOMALY_HREF: Record<string, string> = {
  "Life Score": "/statistics",
  Sleep: "/sleep",
  Habits: "/habits",
  Wellbeing: "/health",
  Mood: "/today",
  Training: "/training",
};


export default function DashboardClassic() {
  const { data, updateSettings } = useStore();
  const d = useDerived();
  const t = useT();
  const todayComp = useTodayComputation();
  const name = data.settings.profile.name?.trim();
  const [editMode, setEditMode] = useState(false);

  // Only surface areas that actually have data (live today or anywhere in history),
  // so an enabled-but-empty area never shows a misleading "0".
  const areasWithData = useMemo(() => {
    const set = new Set<AreaKey>();
    for (const h of d.history) {
      for (const k of Object.keys(h.categories)) set.add(k as AreaKey);
    }
    for (const k of Object.keys(todayComp.categories)) set.add(k as AreaKey);
    return set;
  }, [d.history, todayComp]);

  const enabledAreas = data.settings.areas.filter(
    (a) => a.enabled && a.key !== "finances" && areasWithData.has(a.key),
  );
  const todayGoals = habitsForToday(data, d.today);
  const buildGoals = todayGoals.filter((g) => g.habit.kind === "build");
  const doneCount = buildGoals.filter((g) => g.log?.done).length;

  const liveScore = todayComp.lifeScore ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const vsYesterday = d.yesterdayScore ? liveScore - d.yesterdayScore.lifeScore : 0;
  const vsAvg = d.avg7 ? liveScore - d.avg7 : 0;

  // streak: consecutive days (ending today or yesterday) with a positive score
  const streak = useMemo(() => {
    let s = 0;
    for (let i = d.history.length - 1; i >= 0; i--) {
      if (d.history[i].lifeScore > 0) s++;
      else break;
    }
    return s;
  }, [d.history]);

  const elo = d.todayScore?.elo ?? data.settings.eloStart;
  const eloBest = d.history.reduce((m, h) => Math.max(m, h.elo), data.settings.eloStart);

  const level = useMemo(() => computeLevel(data, d.history), [data, d.history]);
  const challenges = useMemo(() => weeklyChallenges(data, d.byDate, d.today), [data, d.byDate, d.today]);
  const chDone = challenges.filter((c) => c.done).length;
  const nextChallenge = challenges.find((c) => !c.done);
  const anomalies = useMemo(() => detectAnomalies(data, d.history), [data, d.history]);
  const warning = useMemo(() => earlyWarning(d.history), [d.history]);
  const prediction = useMemo(() => predictTomorrow(d.history), [d.history]);
  const weeklyFocus = useMemo(
    () => [...data.weeklyReviews].filter((r) => r.focus?.trim()).sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1))[0] ?? null,
    [data.weeklyReviews],
  );

  const layout = effectiveLayout(data.settings.dashboard);
  const order = layout.order;
  const hidden = new Set<string>(layout.hidden);

  function persist(nextOrder: CardId[], nextHidden: Set<string>) {
    updateSettings({ dashboard: { order: nextOrder, hidden: [...nextHidden] } });
  }
  function move(id: CardId, dir: -1 | 1) {
    const arr = [...order];
    const i = arr.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    persist(arr, hidden);
  }
  function toggleHide(id: CardId) {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persist(order, next);
  }

  const coachOn = !!data.settings.aiCoachEnabled;
  const blocks: Record<CardId, React.ReactNode> = {
    coachBriefing: coachOn ? <CoachBriefing /> : null,
    coachCheckin: coachOn ? <CoachWeeklyCheckin /> : null,
    weekPlan: <WeeklyPlanner />,
    anomalies: (anomalies.length > 0 || editMode) && (
      <Card>
        <SectionTitle right={<AlertTriangle size={16} className="text-[var(--warn)]" />}>{t("Heads up")}</SectionTitle>
        {anomalies.length === 0 ? (
          <p className="py-2 text-sm text-[var(--text-muted)]">{t("Nothing unusual — your recent numbers are close to your norm.")}</p>
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
    ),
    weeklyFocus: (weeklyFocus || editMode) && (
      <Link href="/reports" className="block">
        <Card className="flex items-center gap-4 !py-4 transition hover:border-[var(--accent)]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Target size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">{t("This week's focus")}</div>
            {weeklyFocus ? (
              <div className="mt-0.5 truncate text-sm font-medium">{weeklyFocus.focus}</div>
            ) : (
              <div className="mt-0.5 text-sm text-[var(--text-muted)]">{t("Set an intention in your weekly review.")}</div>
            )}
          </div>
          <ChevronRight size={18} className="shrink-0 text-[var(--text-faint)]" />
        </Card>
      </Link>
    ),
    level: (
      <Link href="/achievements" className="block">
        <Card className="flex items-center gap-4 !py-4 transition hover:border-[var(--accent)]">
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <span className="text-[9px] font-semibold uppercase leading-none tracking-wide">{t("Level")}</span>
            <span className="num text-lg font-bold leading-tight">{level.level}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="font-semibold">{t(level.title)}</span>
              <span className="text-[var(--text-faint)]">{level.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]">
              <div className="grad h-full rounded-full" style={{ width: `${level.pct}%` }} />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
              <Target size={12} className="shrink-0 text-[var(--accent)]" />
              {nextChallenge ? (
                <span className="truncate">{challengeShort(nextChallenge, t)}</span>
              ) : (
                <span>{t("All challenges done this week 🎉")}</span>
              )}
              <span className="ml-auto shrink-0 text-[var(--text-faint)]">{chDone}/{challenges.length}</span>
            </div>
          </div>
          <ChevronRight size={18} className="shrink-0 text-[var(--text-faint)]" />
        </Card>
      </Link>
    ),
    categories: (enabledAreas.length > 0 || editMode) && (
      <Card>
        <SectionTitle right={<Link href="/statistics" className="text-xs text-[var(--accent)]">{t("All stats →")}</Link>}>
          {t("Categories")}
        </SectionTitle>
        {enabledAreas.length === 0 ? (
          <p className="py-2 text-sm text-[var(--text-muted)]">{t("Log a few days to see your category scores here.")}</p>
        ) : (
          <div className="flex flex-col">
            {enabledAreas.map((a) => (
              <CategoryRow key={a.key} area={a.key} derived={d} live={todayComp.categories[a.key]} />
            ))}
          </div>
        )}
      </Card>
    ),
    insights: (d.insights.length > 0 || editMode) && (
      <Card>
        <SectionTitle right={<Badge tone="accent">{t("Data-driven")}</Badge>}>{t("Insights")}</SectionTitle>
        {d.insights.length === 0 ? (
          <p className="py-2 text-sm text-[var(--text-muted)]">{t("Insights appear once there's enough data to spot patterns.")}</p>
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
    ),
    activity: (
      <Card>
        <SectionTitle right={<Link href="/calendar" className="text-xs text-[var(--accent)]">{t("Calendar →")}</Link>}>
          {t("Activity")}
        </SectionTitle>
        <MiniHeatmap />
      </Card>
    ),
    goals: (
      <Card>
        <SectionTitle right={<Link href="/today" className="text-xs text-[var(--accent)]">{t("Open →")}</Link>}>
          {t("Today's goals")}
        </SectionTitle>
        {todayGoals.length === 0 ? (
          <EmptyState
            title={t("No habits scheduled today")}
            hint={t("Add habits to start building your daily plan.")}
            action={
              <Link href="/habits">
                <Button variant="soft" size="sm">{t("Add habits")}</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-x-[26px] sm:grid-cols-2">
            {todayGoals.map((g) => (
              <HabitRow key={g.habit.id} item={g} date={d.today} />
            ))}
          </div>
        )}
      </Card>
    ),
  };

  const visible = order.filter((id) => !hidden.has(id));
  const hiddenList = order.filter((id) => hidden.has(id));

  return (
    <div>
      <PageHeader
        kicker={`${t("Life Rating")} · ${elo.toLocaleString()}`}
        title={name ? `${t("Dashboard")} · ${name}` : t("Dashboard")}
        subtitle={fmtLong(d.today)}
        action={
          <div className="flex items-center gap-2">
            <Button variant={editMode ? "primary" : "ghost"} size="sm" onClick={() => setEditMode((e) => !e)}>
              <SlidersHorizontal size={15} /> {editMode ? t("Done") : t("Customize")}
            </Button>
            <Link href="/today" className="hidden sm:block">
              <Button variant="soft">{t("Log today")}</Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-col gap-[22px]">
        {/* Focus zone: Life Score + Rating ring (always pinned) */}
        <section>
          <div className="flex items-center gap-[22px]">
            <div className="min-w-0 flex-1">
              <div className="flex items-end gap-2.5">
                <span className="num text-[78px] font-bold leading-[.86] tracking-[-0.05em]">{liveScore}</span>
                {liveScore > 0 && <span className="mb-2"><Delta value={vsAvg} pill /></span>}
              </div>
              <div
                className="mt-2.5 text-[13px] font-semibold"
                style={{ color: liveScore > 0 ? scoreColor(liveScore) : "var(--text-faint)" }}
              >
                {liveScore > 0 ? t(scoreLabel(liveScore)) : t("No data yet")}
              </div>
              <div className="mt-1 text-[12.5px] text-[var(--text-faint)]">
                {t("Life Score")} · {t("7-day avg")} {d.avg7}
                {prediction ? ` · ${t("likely")} ${prediction.value} ${prediction.trend > 0 ? "↗" : prediction.trend < 0 ? "↘" : "→"}` : ""}
              </div>
            </div>
            <RatingRing elo={elo} best={eloBest} label={t("Rating")} />
          </div>

          {/* Goals progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-muted)]">{t("Today")} · {doneCount}/{buildGoals.length} {t("goals")}</span>
              {todayComp.slips > 0 && <span className="font-semibold text-[var(--bad)]">{todayComp.slips} {t("Reduce")}</span>}
            </div>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: Math.max(buildGoals.length, 1) }).map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 flex-1 rounded-full"
                  style={{ background: i < doneCount ? "linear-gradient(135deg,var(--area-a),var(--area-b))" : "var(--surface-2)" }}
                />
              ))}
            </div>
          </div>

          {/* Hairline metric strip */}
          <div className="mt-5 grid grid-cols-2 border-y border-[var(--surface-2)]">
            <MetricCell icon={<Flame size={13} />} label={t("Streak")} value={<><AnimatedNumber value={streak} /><span className="text-[15px] text-[var(--text-muted)]">d</span></>} right />
            <MetricCell icon={<Trophy size={13} />} label={t("Best rating")} value={eloBest.toLocaleString()} />
            <MetricCell icon={<ArrowUpRight size={13} />} label={t("7-day avg")} value={<AnimatedNumber value={d.avg7} />} right top />
            <MetricCell icon={<Sparkles size={13} />} label={t("Goals")} value={`${doneCount}/${buildGoals.length}`} top />
          </div>
        </section>

        {/* Early warning: a dip forming right now (below the hero, only when active) */}
        {warning && (
          <Link href="/statistics" className="block">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--bad)]/40 bg-[var(--bad)]/10 p-4 transition hover:border-[var(--bad)]">
              <AlertTriangle size={22} className="shrink-0 text-[var(--bad)]" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{t("Heads up — a dip is forming")}</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {warning.kind === "slide"
                    ? t("Your score has slipped {n} days running. A small win today can turn it around.", { n: warning.magnitude })
                    : t("The last days are running {n} points below your usual. Worth a gentle reset.", { n: warning.magnitude })}
                </div>
              </div>
              <ArrowUpRight size={18} className="shrink-0 text-[var(--text-faint)]" />
            </div>
          </Link>
        )}

        {/* Streak at risk: nudge to log something today */}
        {streak >= 2 && !dayHasEntry(data, d.today) && (
          <Link href="/today" className="block">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 p-4 transition hover:border-[var(--warn)]">
              <Flame size={22} className="shrink-0 text-[var(--warn)]" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{t("Keep your {n}-day streak alive", { n: streak })}</div>
                <div className="text-xs text-[var(--text-muted)]">{t("Log anything today so your streak doesn't reset.")}</div>
              </div>
              <ArrowUpRight size={18} className="shrink-0 text-[var(--text-faint)]" />
            </div>
          </Link>
        )}

        <HintCard id="dashboard-v2" title={t("Make this dashboard yours")}>
          {t("Tap Customize to reorder or hide cards. The new Heads up card flags anything unusual in your recent data — tap it to jump to the details.")}
        </HintCard>

        {/* Reorderable / hideable blocks */}
        {visible.map((id) =>
          blocks[id] ? (
            <MovableBlock key={id} id={id} editMode={editMode} onMove={move} onHide={() => toggleHide(id)} t={t}>
              {blocks[id]}
            </MovableBlock>
          ) : null,
        )}

        {/* Hidden tray (edit mode only) */}
        {editMode && hiddenList.length > 0 && (
          <Card className="!bg-[var(--surface-2)]">
            <SectionTitle>{t("Hidden cards")}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {hiddenList.map((id) => (
                <button
                  key={id}
                  onClick={() => toggleHide(id)}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium hover:border-[var(--accent)]"
                >
                  <Eye size={14} /> {t(SHARED_CARD_LABELS[id])}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function MovableBlock({
  id,
  editMode,
  onMove,
  onHide,
  t,
  children,
}: {
  id: CardId;
  editMode: boolean;
  onMove: (id: CardId, dir: -1 | 1) => void;
  onHide: () => void;
  t: (k: string) => string;
  children: React.ReactNode;
}) {
  if (!editMode) return <>{children}</>;
  return (
    <div className="relative rounded-2xl outline-2 outline-dashed outline-[var(--accent)]/40">
      <div className="pointer-events-none opacity-90">{children}</div>
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow)]">
        <button onClick={() => onMove(id, -1)} className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]" aria-label={t("Move up")}>
          <ArrowUp size={15} />
        </button>
        <button onClick={() => onMove(id, 1)} className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]" aria-label={t("Move down")}>
          <ArrowDown size={15} />
        </button>
        <button onClick={onHide} className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]" aria-label={t("Hide")}>
          <EyeOff size={15} />
        </button>
      </div>
    </div>
  );
}

export function toneColor(tone: "good" | "warn" | "info"): string {
  return tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--info)";
}

function challengeShort(
  c: { id: string; target: number },
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  switch (c.id) {
    case "train": return t("Train {n}× this week", { n: c.target });
    case "logall": return t("Log all 7 days");
    case "sleep": return t("Average {h}h sleep", { h: c.target });
    case "habits": return t("Hit {n}% of your habits", { n: c.target });
    case "journal": return t("Write 3 journal entries");
    case "checkin": return t("Check in on 5 days");
    default: return "";
  }
}

/** Circular ELO/rating ring for the dashboard focus zone. */
function RatingRing({ elo, best, label }: { elo: number; best: number; label: string }) {
  const frac = best > 0 ? Math.max(0, Math.min(1, elo / best)) : 0;
  const r = 54;
  const c = 2 * Math.PI * r;
  const off = c * (1 - frac);
  return (
    <div className="relative flex h-[116px] w-[116px] shrink-0 items-center justify-center">
      <svg width="116" height="116" className="-rotate-90">
        <defs>
          <linearGradient id="eloRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--area-a)" }} />
            <stop offset="1" style={{ stopColor: "var(--area-b)" }} />
          </linearGradient>
        </defs>
        <circle cx="58" cy="58" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
        <circle cx="58" cy="58" r={r} fill="none" stroke="url(#eloRing)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute text-center">
        <div className="num text-[19px] font-bold leading-none">{elo.toLocaleString()}</div>
        <div className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">{label}</div>
      </div>
    </div>
  );
}

/** One cell of the dashboard's hairline 2×2 metric strip. */
function MetricCell({
  icon,
  label,
  value,
  right,
  top,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  right?: boolean;
  top?: boolean;
}) {
  return (
    <div className={`py-3.5 ${right ? "border-r border-[var(--surface-2)] pr-4" : "pl-4"} ${top ? "border-t border-[var(--surface-2)]" : ""}`}>
      <div className="flex items-center gap-1.5 text-[var(--text-faint)]">
        {icon}
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em]">{label}</span>
      </div>
      <div className="num mt-1.5 text-[24px] font-bold tracking-[-0.03em]">{value}</div>
    </div>
  );
}

function CategoryRow({
  area,
  derived,
  live,
}: {
  area: AreaKey;
  derived: ReturnType<typeof useDerived>;
  live?: number;
}) {
  const t = useT();
  const color = areaColor(area);
  const Icon = AREA_ICONS[area];
  const yest = derived.yesterdayScore?.categories[area];
  const cur = live ?? derived.todayScore?.categories[area] ?? 0;

  return (
    <div className="flex items-center gap-3 py-[7px]">
      <IconTile color={color} size={32}>
        <Icon size={16} strokeWidth={2} />
      </IconTile>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13.5px] font-medium">{t(AREA_LABELS[area])}</span>
          <span className="flex items-baseline gap-[7px]">
            <span className="num text-[15px] font-bold">{cur}</span>
            {yest !== undefined && <Delta value={cur - yest} />}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div className="h-full rounded-full" style={{ width: `${cur}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}
