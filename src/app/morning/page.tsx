"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Flame, ListTodo, Moon, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/defaults";
import { useDerived } from "@/lib/useDerived";
import { useT } from "@/lib/i18n";
import { habitsForToday } from "@/lib/habitView";
import { sleepScore } from "@/lib/score";
import { activityStreak } from "@/lib/streak";
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

  const streak = useMemo(() => activityStreak(d.history, data.settings), [d.history, data.settings]);

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

        {/* Optional top-3 focus for the day */}
        <FocusCard />

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

type FocusItem = { id: string; text: string; done: boolean };

function FocusCard() {
  const { data, setFocus } = useStore();
  const t = useT();
  const date = todayISO();
  const existing = data.focus.find((f) => f.date === date);

  const seed = (): FocusItem[] => {
    const base = existing?.items.map((i) => ({ ...i })) ?? [];
    while (base.length < 3) base.push({ id: uid("foc"), text: "", done: false });
    return base.slice(0, 3);
  };
  const [items, setItems] = useState<FocusItem[]>(seed);

  function persist(next: FocusItem[]) {
    setItems(next);
    setFocus(date, next.filter((i) => i.text.trim()));
  }
  const doneCount = items.filter((i) => i.text.trim() && i.done).length;
  const setCount = items.filter((i) => i.text.trim()).length;

  return (
    <Card>
      <SectionTitle
        right={
          setCount > 0 ? (
            <span className="text-xs text-[var(--text-faint)]">
              {doneCount}/{setCount} · {t("up to +2 score")}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-faint)]">{t("optional")}</span>
          )
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <ListTodo size={16} /> {t("Today's focus")}
        </span>
      </SectionTitle>
      <p className="mb-2 text-xs text-[var(--text-muted)]">{t("Pick up to three things that would make today a win.")}</p>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-2.5">
            <button
              onClick={() => persist(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
              disabled={!it.text.trim()}
              aria-label={t("Mark done")}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition disabled:opacity-40 ${
                it.done && it.text.trim() ? "border-[var(--good)] bg-[var(--good)] text-white" : "border-[var(--border)] text-transparent"
              }`}
            >
              <Check size={13} strokeWidth={3} />
            </button>
            <input
              value={it.text}
              onChange={(e) => persist(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              placeholder={`${t("Focus")} ${i + 1}`}
              className={`flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] ${it.done && it.text.trim() ? "text-[var(--text-muted)] line-through" : ""}`}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
