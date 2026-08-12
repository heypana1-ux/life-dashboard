"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Flame, Moon, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { habitsForToday } from "@/lib/habitView";
import { sleepScore } from "@/lib/score";
import { fmtDuration, fmtLong, sleepDurationMinutes, todayISO } from "@/lib/date";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { HabitRow } from "@/components/HabitRow";

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
    <div>
      <PageHeader title={t("Morning")} subtitle={fmtLong(date)} />

      <div className="flex flex-col gap-[18px]">
        {/* Gradient greeting banner */}
        <div className="grad relative overflow-hidden rounded-[22px] p-8 text-white shadow-[var(--shadow)] sm:px-8">
          <p className="text-sm font-medium opacity-85">{fmtLong(date)}</p>
          <h2 className="mt-2 text-[32px] font-bold tracking-[-0.03em]">
            {name ? `${greeting}, ${name}` : greeting}
          </h2>
          <p className="mt-1.5 max-w-[460px] text-[15px] leading-[1.5] opacity-90">
            {t("Set your intention for the day. Small, consistent steps compound.")}
          </p>
        </div>

        {/* 3 tiles */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="tile p-5">
            <div className="mb-3 flex items-center gap-2 text-[var(--text-faint)]">
              <Moon size={16} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em]">{t("Last night")}</span>
            </div>
            {sleep ? (
              <>
                <div className="num text-[30px] font-bold tracking-[-0.02em]">{fmtDuration(sleepMin)}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-[var(--text-muted)]">
                  {t("Sleep")}{" "}
                  <span className="num font-bold text-[var(--good)]">{sScore}</span>
                  · {t("Morning energy")} {sleep.morningEnergy}/10
                </div>
              </>
            ) : (
              <Link href="/sleep" className="text-sm text-[var(--accent)]">
                {t("Log sleep")}
              </Link>
            )}
          </div>
          <div className="tile p-5">
            <div className="mb-3 flex items-center gap-2 text-[var(--text-faint)]">
              <Trophy size={16} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em]">{t("Life Rating")}</span>
            </div>
            <div className="num text-[30px] font-bold tracking-[-0.02em]">{elo.toLocaleString()}</div>
          </div>
          <div className="tile p-5">
            <div className="mb-3 flex items-center gap-2 text-[var(--text-faint)]">
              <Flame size={16} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em]">{t("Streak")}</span>
            </div>
            <div className="num text-[30px] font-bold tracking-[-0.02em]">{streak}d</div>
            <div className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">{t("days with activity")}</div>
          </div>
        </div>

        {/* Focus */}
        <Card>
          <SectionTitle right={<Link href="/today" className="text-xs text-[var(--accent)]">{t("Open →")}</Link>}>
            {t("Today's goals")}
          </SectionTitle>
          {goals.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">{t("No habits scheduled today")}</p>
          ) : (
            <div className="grid gap-x-[26px] sm:grid-cols-2">
              {goals.map((g) => (
                <HabitRow key={g.habit.id} item={g} date={date} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
