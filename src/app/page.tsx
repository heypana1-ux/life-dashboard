"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, ChevronRight, Flame, Sparkles, Target, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived, useTodayComputation } from "@/lib/useDerived";
import { AREA_LABELS } from "@/lib/defaults";
import { habitsForToday } from "@/lib/habitView";
import { computeLevel } from "@/lib/level";
import { weeklyChallenges } from "@/lib/challenges";
import { fmtLong } from "@/lib/date";
import { scoreLabel } from "@/lib/score";
import { AreaKey } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { Card, PageHeader, SectionTitle, Delta, Badge, Button, EmptyState, StatTile } from "@/components/ui";
import { ScoreRing, Meter } from "@/components/ScoreRing";
import { MiniSpark } from "@/components/charts";
import { HabitRow } from "@/components/HabitRow";
import { CoachBriefing } from "@/components/Coach";

export default function DashboardPage() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const todayComp = useTodayComputation();
  const name = data.settings.profile.name?.trim();

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

  return (
    <div>
      <PageHeader
        title={name ? `${t("Dashboard")} · ${name}` : t("Dashboard")}
        subtitle={fmtLong(d.today)}
        action={
          <Link href="/today" className="hidden sm:block">
            <Button variant="soft">{t("Log today")}</Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-[18px]">
        {/* Proactive coach briefing (only when AI coach is on) */}
        <CoachBriefing />

        {/* Hero row: score card + 2x2 stat tiles */}
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
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-[14px]">
            <StatTile icon={<Trophy size={15} />} label={t("Life Rating")} value={elo.toLocaleString()} sub={`${t("Best")} ${eloBest.toLocaleString()}`} />
            <StatTile icon={<Flame size={15} />} label={t("Streak")} value={`${streak}d`} sub={t("days with activity")} />
            <StatTile icon={<ArrowUpRight size={15} />} label={t("7-day avg")} value={String(d.avg7)} sub={t("Life Score")} />
            <StatTile icon={<Sparkles size={15} />} label={t("Today")} value={`${doneCount}/${buildGoals.length}`} sub={t("goals done")} />
          </div>
        </div>

        {/* Level & weekly challenge strip */}
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

        {/* Categories + Insights */}
        <div className="grid gap-[18px] lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <SectionTitle right={<Link href="/statistics" className="text-xs text-[var(--accent)]">{t("All stats →")}</Link>}>
              {t("Categories")}
            </SectionTitle>
            <div className="flex flex-col">
              {enabledAreas.map((a) => (
                <CategoryRow key={a.key} area={a.key} derived={d} live={todayComp.categories[a.key]} />
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle right={<Badge tone="accent">{t("Data-driven")}</Badge>}>{t("Insights")}</SectionTitle>
            <div className="flex flex-col gap-2.5">
              {d.insights.slice(0, 4).map((ins) => (
                <div key={ins.id} className="flex gap-[11px] rounded-[13px] bg-[var(--surface-2)] p-[13px]">
                  <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: toneColor(ins.tone) }} />
                  <p className="text-[13px] leading-[1.5]">{ins.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-[14px] text-[11px] leading-[1.5] text-[var(--text-faint)]">
              {t("Observations from your own logs. These are associations, not medical or causal claims.")}
            </p>
          </Card>
        </div>

        {/* Today's goals */}
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

const AREA_COLORS: Partial<Record<AreaKey, string>> = {
  productivity: "#4f46e5",
  sport: "#16a34a",
  sleep: "#0ea5e9",
  habits: "#d97706",
  learning: "#9333ea",
  creativity: "#db2777",
  reflection: "#0891b2",
};

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
  const color = AREA_COLORS[area] ?? "var(--accent)";
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
