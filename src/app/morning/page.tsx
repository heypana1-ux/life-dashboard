"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Flame, Moon, Sunrise, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { habitsForToday } from "@/lib/habitView";
import { sleepScore } from "@/lib/score";
import { fmtDuration, fmtLong, sleepDurationMinutes, todayISO } from "@/lib/date";
import { Card, PageHeader, SectionTitle, Button } from "@/components/ui";
import { HabitRow } from "@/components/HabitRow";
import { ScoreRing } from "@/components/ScoreRing";

export default function MorningPage() {
  const { data } = useStore();
  const d = useDerived();
  const t = useT();
  const date = todayISO();
  const name = data.settings.profile.name?.trim();

  const sleep = data.sleep.find((s) => s.date === date);
  const sleepMin = sleep
    ? sleepDurationMinutes(sleep.bedTime, sleep.wakeTime, sleep.fallAsleepMinutes ?? 0)
    : 0;
  const sScore = sleep ? Math.round(sleepScore(sleep, data.settings.sleepTargetMinutes)) : null;

  const goals = habitsForToday(data, date).filter((g) => g.habit.kind === "build");
  const elo = d.todayScore?.elo ?? data.settings.eloStart;

  const streak = useMemo(() => {
    let s = 0;
    for (let i = d.history.length - 1; i >= 0; i--) {
      if (d.history[i].lifeScore > 0) s++;
      else break;
    }
    return s;
  }, [d.history]);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening");

  return (
    <div className="space-y-6">
      <PageHeader
        title={name ? `${greeting}, ${name}` : greeting}
        subtitle={fmtLong(date)}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center">
          <SectionTitle>{t("Last night")}</SectionTitle>
          {sleep ? (
            <>
              <ScoreRing value={sScore ?? 0} size={150} label={t("Sleep")} />
              <div className="mt-3 text-center text-sm text-[var(--text-muted)]">
                {fmtDuration(sleepMin)} · {t("Morning energy")} {sleep.morningEnergy}/10
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Moon className="text-[var(--text-faint)]" size={28} />
              <p className="text-sm text-[var(--text-muted)]">{t("No sleep logged for last night.")}</p>
              <Link href="/sleep">
                <Button variant="soft" size="sm">{t("Log sleep")}</Button>
              </Link>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-rows-2">
          <Stat icon={<Trophy size={18} />} label={t("Life Rating")} value={elo.toLocaleString()} />
          <Stat icon={<Flame size={18} />} label={t("Streak")} value={`${streak}d`} />
          <Card className="col-span-2 flex items-center gap-3 !py-4">
            <Sunrise className="shrink-0 text-[var(--accent)]" size={22} />
            <p className="text-sm text-[var(--text-muted)]">
              {t("Set your intention for the day. Small, consistent steps compound.")}
            </p>
          </Card>
        </div>
      </div>

      <Card>
        <SectionTitle right={<Link href="/today" className="text-xs text-[var(--accent)]">{t("Open →")}</Link>}>
          {t("Today's goals")}
        </SectionTitle>
        {goals.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("No habits scheduled today")}</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {goals.map((g) => (
              <HabitRow key={g.habit.id} item={g} date={date} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="!p-4">
      <div className="mb-1 flex items-center gap-2 text-[var(--text-faint)]">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
