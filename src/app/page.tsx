"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, Flame, Sparkles, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived, useTodayComputation } from "@/lib/useDerived";
import { AREA_LABELS } from "@/lib/defaults";
import { habitsForToday } from "@/lib/habitView";
import { fmtLong } from "@/lib/date";
import { scoreLabel } from "@/lib/score";
import { AreaKey } from "@/lib/types";
import { Card, PageHeader, SectionTitle, Delta, Badge, Button, EmptyState } from "@/components/ui";
import { ScoreRing, Meter } from "@/components/ScoreRing";
import { MiniSpark } from "@/components/charts";
import { HabitRow } from "@/components/HabitRow";

export default function DashboardPage() {
  const { data } = useStore();
  const d = useDerived();
  const todayComp = useTodayComputation();

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={fmtLong(d.today)}
        action={
          <Link href="/today" className="hidden sm:block">
            <Button variant="soft">Log today</Button>
          </Link>
        }
      />

      {/* Hero: score + categories */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center lg:col-span-1">
          <SectionTitle>Life Score today</SectionTitle>
          <ScoreRing value={liveScore} sublabel={liveScore > 0 ? scoreLabel(liveScore) : "No data yet"} />
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-[var(--text-faint)]">vs yesterday</span>
              <Delta value={vsYesterday} />
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div className="flex flex-col items-center">
              <span className="text-[var(--text-faint)]">vs 7-day avg</span>
              <Delta value={vsAvg} />
            </div>
          </div>
          {todayComp.slips > 0 && (
            <p className="mt-3 text-xs text-[var(--bad)]">
              {todayComp.slips} reduce-habit {todayComp.slips === 1 ? "slip" : "slips"} logged today
            </p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle right={<Link href="/statistics" className="text-xs text-[var(--accent)]">All stats →</Link>}>
            Categories
          </SectionTitle>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {enabledAreas.map((a) => (
              <CategoryRow key={a.key} area={a.key} derived={d} live={todayComp.categories[a.key]} />
            ))}
          </div>
        </Card>
      </div>

      {/* Rating + streak strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Trophy size={18} />}
          label="Life Rating"
          value={elo.toLocaleString()}
          sub={`Best ${eloBest.toLocaleString()}`}
        />
        <StatCard
          icon={<Flame size={18} />}
          label="Streak"
          value={`${streak}d`}
          sub="days with activity"
        />
        <StatCard
          icon={<ArrowUpRight size={18} />}
          label="7-day avg"
          value={String(d.avg7)}
          sub="Life Score"
        />
        <StatCard
          icon={<Sparkles size={18} />}
          label="Today"
          value={`${doneCount}/${buildGoals.length}`}
          sub="goals done"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's goals */}
        <Card>
          <SectionTitle right={<Link href="/today" className="text-xs text-[var(--accent)]">Open →</Link>}>
            Today&apos;s goals
          </SectionTitle>
          {todayGoals.length === 0 ? (
            <EmptyState
              title="No habits scheduled today"
              hint="Add habits to start building your daily plan."
              action={
                <Link href="/habits">
                  <Button variant="soft" size="sm">
                    Add habits
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {todayGoals.map((g) => (
                <HabitRow key={g.habit.id} item={g} date={d.today} />
              ))}
            </div>
          )}
        </Card>

        {/* Insights */}
        <Card>
          <SectionTitle right={<Badge tone="accent">Data-driven</Badge>}>Insights</SectionTitle>
          <div className="space-y-2.5">
            {d.insights.slice(0, 4).map((ins) => (
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
                <p className="text-sm text-[var(--text)]">{ins.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[var(--text-faint)]">
            Observations from your own logs. These are associations, not medical or causal claims.
          </p>
        </Card>
      </div>
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
  const spark = derived.history
    .slice(-14)
    .map((h) => ({ date: h.date, value: h.categories[area] ?? 0 }));
  const yest = derived.yesterdayScore?.categories[area];
  const cur = live ?? derived.todayScore?.categories[area] ?? 0;

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] py-3 last:border-0 sm:border-0 sm:py-2.5">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium">{AREA_LABELS[area]}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">{cur}</span>
            {yest !== undefined && <Delta value={cur - yest} />}
          </div>
        </div>
        <Meter value={cur} />
      </div>
      <div className="hidden w-20 sm:block">
        <MiniSpark data={spark} />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="!p-4">
      <div className="mb-1 flex items-center gap-2 text-[var(--text-faint)]">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{sub}</div>
    </Card>
  );
}
