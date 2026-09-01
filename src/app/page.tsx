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
import { areaColor } from "@/lib/areaStyle";
import { computeLevel } from "@/lib/level";
import { weeklyChallenges } from "@/lib/challenges";
import { detectAnomalies } from "@/lib/anomalies";
import { earlyWarning, predictTomorrow } from "@/lib/forecast";
import { fmtLong } from "@/lib/date";
import { scoreLabel } from "@/lib/score";
import { AreaKey } from "@/lib/types";
import { effectiveLayout, CARD_LABELS as SHARED_CARD_LABELS, type DashboardCardId } from "@/lib/dashboardCards";
import { useT } from "@/lib/i18n";
import { Card, PageHeader, SectionTitle, Delta, Badge, Button, EmptyState, StatTile, AnimatedNumber } from "@/components/ui";
import { ScoreRing, Meter } from "@/components/ScoreRing";
import { MiniSpark } from "@/components/charts";
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


export default function DashboardPage() {
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
          <div className="flex flex-col gap-2.5">
            {d.insights.slice(0, 4).map((ins) => (
              <div key={ins.id} className="flex gap-[11px] rounded-[13px] bg-[var(--surface-2)] p-[13px]">
                <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: toneColor(ins.tone) }} />
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

      <div className="flex flex-col gap-[18px]">
        {/* Hero row: score card + 2x2 stat tiles (always pinned) — nothing sits above it */}
        <div className="grid gap-[18px] lg:grid-cols-[1.15fr_1fr]">
          <Card className="flex flex-col items-center gap-6 !p-[26px] sm:flex-row sm:gap-[26px]">
            <ScoreRing
              value={liveScore}
              sublabel={liveScore > 0 ? t(scoreLabel(liveScore)) : t("No data yet")}
            />
            <div className="min-w-0 flex-1">
              <p className="slabel">{t("Life Score today")}</p>
              <p className="mt-1 text-sm leading-[1.45] text-[var(--text-muted)]">
                {liveScore > 0
                  ? `${doneCount}/${buildGoals.length} ${t("goals done")}`
                  : t("No data yet")}
                {todayComp.slips > 0 && (
                  <span className="text-[var(--bad)]">
                    {" "}· {todayComp.slips} {t("Reduce")}
                  </span>
                )}
              </p>
              <div className="mt-[18px] flex gap-6">
                <div>
                  <p className="text-[11px] text-[var(--text-faint)]">{t("vs yesterday")}</p>
                  <div className="mt-[3px]"><Delta value={vsYesterday} className="!text-[15px]" /></div>
                </div>
                <div className="w-px bg-[var(--border)]" />
                <div>
                  <p className="text-[11px] text-[var(--text-faint)]">{t("vs 7-day avg")}</p>
                  <div className="mt-[3px]"><Delta value={vsAvg} className="!text-[15px]" /></div>
                </div>
              </div>
              {prediction && (
                <p className="mt-[14px] text-[11px] text-[var(--text-faint)]">
                  {t("Tomorrow, likely around")}{" "}
                  <span className="num font-semibold text-[var(--text-muted)]">{prediction.value}</span>{" "}
                  {prediction.trend > 0 ? "↗" : prediction.trend < 0 ? "↘" : "→"}
                </p>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-[14px]">
            <StatTile icon={<Trophy size={15} />} label={t("Life Rating")} value={<AnimatedNumber value={elo} />} sub={`${t("Best")} ${eloBest.toLocaleString()}`} />
            <StatTile icon={<Flame size={15} />} label={t("Streak")} value={<><AnimatedNumber value={streak} />d</>} sub={t("days with activity")} />
            <StatTile icon={<ArrowUpRight size={15} />} label={t("7-day avg")} value={<AnimatedNumber value={d.avg7} />} sub={t("Life Score")} />
            <StatTile icon={<Sparkles size={15} />} label={t("Today")} value={`${doneCount}/${buildGoals.length}`} sub={t("goals done")} />
          </div>
        </div>

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
  const spark = derived.history
    .slice(-14)
    .map((h) => ({ date: h.date, value: h.categories[area] ?? 0 }));
  const yest = derived.yesterdayScore?.categories[area];
  const cur = live ?? derived.todayScore?.categories[area] ?? 0;

  return (
    <div className="flex items-center gap-4 border-b border-[var(--border)] py-[11px] last:border-0">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13.5px] font-medium">{t(AREA_LABELS[area])}</span>
          <div className="flex items-center gap-2">
            <span className="num text-[13.5px] font-semibold">{cur}</span>
            {yest !== undefined && <Delta value={cur - yest} />}
          </div>
        </div>
        <Meter value={cur} color={color} />
      </div>
      <div className="hidden w-20 shrink-0 sm:block">
        <MiniSpark data={spark} color={color} />
      </div>
    </div>
  );
}
